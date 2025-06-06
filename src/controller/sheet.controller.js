import pool from "../init/pgConnection.js";
import User from "../models/user.model.js";
import Admin from "../models/admin.model.js";

// Create new sheet with unique name check for particular user in particular organization
export const createSheet = async (req, res) => {
  try {
    const org_id = req.user.companyId;
    const createdby_id = req.user.userId || req.user.adminId;

    if (!org_id || !createdby_id) {
      return res
        .status(401)
        .json({ message: "CompanyId or userId is missing" });
    }

    const { name, collaborators = [] } = req.body;

    if (!name)
      return res.status(400).json({ message: "Missing required fields" });

    // 🔍 Check if a sheet with the same name already exists
    const checkQuery = `
      SELECT id FROM "TaskTracker".sheets
      WHERE name = $1 AND org_id = $2 AND createdby_id = $3
      LIMIT 1;
    `;
    const checkResult = await pool.query(checkQuery, [
      name,
      org_id,
      createdby_id,
    ]);

    if (checkResult.rows.length > 0) {
      return res
        .status(409)
        .json({ message: "Sheet with the same name already exists" });
    }

    // ✅ Proceed to insert
    const insertQuery = `
      INSERT INTO "TaskTracker".sheets (name, createdby_id, org_id, collaborators)
      VALUES ($1, $2, $3, $4::jsonb)
      RETURNING *;
    `;
    const values = [name, createdby_id, org_id, JSON.stringify(collaborators)];
    const result = await pool.query(insertQuery, values);

    res
      .status(201)
      .json({ result: result.rows[0], message: "Sheet created successfully" });
  } catch (error) {
    console.error(`Error creating sheet: ${error}`);
    res
      .status(500)
      .json({ message: "Internal server error in creating spreadsheet" });
  }
};

// controller to updated collaborators and access (ensures only creator should be able to update)
export const updateCollaborators = async (req, res) => {
  try {
    const { sheet_id, collaboratorId, role } = req.body;
    const requesterId = req.user.userId || req.user.adminId;

    if (!sheet_id || !collaboratorId || !["editor", "viewer"].includes(role)) {
      return res.status(400).json({ message: "Missing or invalid input" });
    }

    // 🔍 Fetch sheet with collaborators
    const sheetQuery = `
      SELECT createdby_id, collaborators
      FROM "TaskTracker".sheets
      WHERE id = $1;
    `;
    const sheetResult = await pool.query(sheetQuery, [sheet_id]);

    if (sheetResult.rowCount === 0) {
      return res.status(404).json({ message: "Sheet not found" });
    }

    const { createdby_id, collaborators = [] } = sheetResult.rows[0];

    // 🔐 Only owner can update collaborators
    if (createdby_id !== requesterId) {
      return res
        .status(403)
        .json({ message: "Only the owner can update collaborators" });
    }

    // 🧠 Update or add collaborator
    const updatedCollaborators = Array.isArray(collaborators)
      ? [...collaborators]
      : [];

    const existingIndex = updatedCollaborators.findIndex(
      (c) => c.id === collaboratorId,
    );
    if (existingIndex !== -1) {
      updatedCollaborators[existingIndex].role = role; // update role
    } else {
      updatedCollaborators.push({ id: collaboratorId, role });
    }

    // 📝 Update collaborators in DB
    const updateQuery = `
      UPDATE "TaskTracker".sheets
      SET collaborators = $1::jsonb, updated_at = NOW()
      WHERE id = $2
      RETURNING *;
    `;
    const updateResult = await pool.query(updateQuery, [
      JSON.stringify(updatedCollaborators),
      sheet_id,
    ]);

    res.status(200).json({
      message: "Collaborator updated successfully",
      sheet: updateResult.rows[0],
    });
  } catch (error) {
    console.error("❌ Error updating collaborator:", error.message);
    res
      .status(500)
      .json({ message: "Internal server error while updating collaborator" });
  }
};

export const getSheets = async (req, res) => {
  try {
    const org_id = req.user.companyId;
    const user_id = req.user.userId || req.user.adminId;
    const filter = req.query.filter || "all"; // 'owned', 'shared', or 'all'

    let getSheetsQuery = "";
    let values = [];

    if (filter === "owned") {
      getSheetsQuery = `
        SELECT * FROM sheets
        WHERE org_id = $1 AND createdby_id = $2;
      `;
      values = [org_id, user_id];
    } else if (filter === "shared") {
      getSheetsQuery = `
        SELECT * FROM "TaskTracker".sheets
        WHERE org_id = $1
          AND EXISTS (
            SELECT 1 FROM jsonb_array_elements(collaborators) AS coll
            WHERE coll->>'id' = $2
          );
      `;
      values = [org_id, user_id];
    } else {
      // Get both owned and shared
      getSheetsQuery = `
        SELECT * FROM "TaskTracker".sheets
        WHERE org_id = $1
          AND (
            createdby_id = $2
            OR EXISTS (
              SELECT 1 FROM jsonb_array_elements(collaborators) AS coll
              WHERE coll->>'id' = $2
            )
          );
      `;
      values = [org_id, user_id];
    }

    const result = await pool.query(getSheetsQuery, values);
    const sheets = result.rows;

    // 🧠 Determine if user is admin or normal user
    const isUser = !!req.user.userId;
    const creator = isUser
      ? await User.findById(user_id).select("firstName lastName").lean()
      : await Admin.findById(user_id).select("fullName").lean();

    const createdByName = isUser
      ? `${creator?.firstName || ""} ${creator?.lastName || ""}`.trim()
      : creator?.fullName || "Unknown";

    const populatedSheets = sheets.map((sheet) => ({
      ...sheet,
      createdByName,
    }));

    res.status(200).json({ result: populatedSheets });
  } catch (error) {
    console.error(`❌ Error getting sheets: ${error}`);
    res.status(500).json({
      message: "Internal server error in getting sheets",
    });
  }
};

export const createCells = async (req, res) => {
  try {
    const { sheet_id, cells } = req.body;
    const requesterId = req.user.userId || req.user.adminId;

    if (!sheet_id || !Array.isArray(cells) || cells.length === 0) {
      return res.status(400).json({ message: "Missing or invalid input" });
    }

    // Step 1: Fetch sheet owner and collaborators (collaborators is JSON array of objects)
    const accessQuery = `
      SELECT createdby_id, collaborators
      FROM "TaskTracker".sheets
      WHERE id = $1
    `;
    const accessResult = await pool.query(accessQuery, [sheet_id]);

    if (accessResult.rowCount === 0) {
      return res.status(404).json({ message: "Sheet not found" });
    }

    const { createdby_id, collaborators } = accessResult.rows[0];

    // Step 2: Check if requester is owner or collaborator with "editor" role
    const isOwner = createdby_id === requesterId;

    // collaborators is expected as JSON array: [{ id: string, role: "editor"|"viewer" }]
    const isEditorCollaborator =
      Array.isArray(collaborators) &&
      collaborators.some((c) => c.id === requesterId && c.role === "editor");

    if (!isOwner && !isEditorCollaborator) {
      return res.status(403).json({
        message:
          "Access denied: only owner or collaborators with editor role can modify cells",
      });
    }

    // Step 3: Prepare insert values
    const values = [];
    const placeholders = [];

    cells.forEach((cell, index) => {
      const { row_index, column_index, value = null, formula = null } = cell;

      if (typeof row_index !== "number" || typeof column_index !== "number")
        return;

      const i = index * 6;
      placeholders.push(
        `($${i + 1}, $${i + 2}, $${i + 3}, $${i + 4}, $${i + 5}, $${i + 6})`,
      );
      values.push(
        sheet_id,
        row_index,
        column_index,
        value,
        formula,
        requesterId,
      );
    });

    if (values.length === 0) {
      return res.status(400).json({ message: "No valid cell data provided" });
    }

    // Step 4: Upsert "TaskTracker".cells (insert or update)
    const query = `
      INSERT INTO "TaskTracker".cells (
        sheet_id, row_index, column_index, value, formula, last_edited_by
      )
      VALUES ${placeholders.join(", ")}
      ON CONFLICT (sheet_id, row_index, column_index)
      DO UPDATE SET 
        value = EXCLUDED.value,
        formula = EXCLUDED.formula,
        last_edited_by = EXCLUDED.last_edited_by,
        updated_at = NOW()
      RETURNING *;
    `;

    const result = await pool.query(query, values);

    res.status(201).json({
      message: `${result.rowCount} cells created/updated successfully`,
      cells: result.rows,
    });
  } catch (error) {
    console.error("❌ Error creating cells:", error.message);
    res.status(500).json({
      message: "Internal server error while creating cells",
    });
  }
};

export const getCells = async (req, res) => {
  try {
    const { sheet_id, min_row, max_row, min_col, max_col } = req.query;
    const requesterId = req.user.userId || req.user.adminId;

    if (!sheet_id) {
      return res.status(400).json({ message: "Missing sheet_id" });
    }

    // Step 1: Check if user has access to this sheet
    const accessQuery = `
      SELECT createdby_id, collaborators
      FROM "TaskTracker".sheets
      WHERE id = $1
    `;
    const accessResult = await pool.query(accessQuery, [sheet_id]);

    if (accessResult.rowCount === 0) {
      return res.status(404).json({ message: "Sheet not found" });
    }

    const { createdby_id, collaborators } = accessResult.rows[0];

    const hasAccess =
      createdby_id === requesterId ||
      (Array.isArray(collaborators) &&
        collaborators.some((c) => c.id === requesterId));

    if (!hasAccess) {
      return res.status(403).json({ message: "Access denied to this sheet" });
    }

    // Step 2: Build dynamic cell query
    let query = `SELECT * FROM "TaskTracker".cells WHERE sheet_id = $1`;
    const values = [sheet_id];
    let index = 2;

    if (min_row !== undefined) {
      query += ` AND row_index >= $${index++}`;
      values.push(Number(min_row));
    }
    if (max_row !== undefined) {
      query += ` AND row_index <= $${index++}`;
      values.push(Number(max_row));
    }
    if (min_col !== undefined) {
      query += ` AND column_index >= $${index++}`;
      values.push(Number(min_col));
    }
    if (max_col !== undefined) {
      query += ` AND column_index <= $${index++}`;
      values.push(Number(max_col));
    }

    query += ` ORDER BY row_index ASC, column_index ASC`;

    const result = await pool.query(query, values);

    res.status(200).json({
      message: "Cells fetched successfully",
      cells: result.rows,
    });
  } catch (error) {
    console.error("❌ Error fetching cells:", error.message);
    res.status(500).json({
      message: "Internal server error while fetching cells",
    });
  }
};
