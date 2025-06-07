// import pool from "../init/pgConnection.js";
// import User from "../models/user.model.js";
// import Admin from "../models/admin.model.js";
// import { emitToSheetParticipants } from "../utils/sheetEventEmit.utils.js";
// import { redlock } from "../service/redisClient.service.js";
// import {
//   cacheSheet,
//   getCachedSheet,
//   invalidateSheetCache,
//   cacheCells,
//   getCachedCells,
//   invalidateCellsCache,
// } from "../service/redisCacheHelper.service.js";

// // Create new sheet with unique name check for particular user in particular organization
// export const createSheet = async (req, res) => {
//   try {
//     const org_id = req.user.companyId;
//     const createdby_id = req.user.userId || req.user.adminId;

//     if (!org_id || !createdby_id) {
//       return res
//         .status(401)
//         .json({ message: "CompanyId or userId is missing" });
//     }

//     const { name, collaborators = [] } = req.body;

//     if (!name)
//       return res.status(400).json({ message: "Missing required fields" });

//     // Check if a sheet with the same name already exists
//     const checkQuery = `
//       SELECT id FROM "TaskTracker".sheets
//       WHERE name = $1 AND org_id = $2 AND createdby_id = $3
//       LIMIT 1;
//     `;
//     const checkResult = await pool.query(checkQuery, [
//       name,
//       org_id,
//       createdby_id,
//     ]);

//     if (checkResult.rows.length > 0) {
//       return res
//         .status(409)
//         .json({ message: "Sheet with the same name already exists" });
//     }

//     // Insert new sheet
//     const insertQuery = `
//       INSERT INTO "TaskTracker".sheets (name, createdby_id, org_id, collaborators)
//       VALUES ($1, $2, $3, $4::jsonb)
//       RETURNING *;
//     `;
//     const values = [name, createdby_id, org_id, JSON.stringify(collaborators)];
//     const result = await pool.query(insertQuery, values);

//     const createdSheet = result.rows[0];

//     // Cache the newly created sheet
//     await cacheSheet(createdSheet.id, createdSheet);

//     // Emit event to creator and collaborators about new sheet
//     emitToSheetParticipants(createdSheet, "sheet_created", {
//       sheet: createdSheet,
//       message: "New sheet created",
//     });

//     res
//       .status(201)
//       .json({ result: createdSheet, message: "Sheet created successfully" });
//   } catch (error) {
//     console.error(`Error creating sheet: ${error}`);
//     res
//       .status(500)
//       .json({ message: "Internal server error in creating spreadsheet" });
//   }
// };

// // Update collaborators and access (only creator allowed)
// export const updateCollaborators = async (req, res) => {
//   try {
//     const { sheet_id, collaboratorId, role } = req.body;
//     const requesterId = req.user.userId || req.user.adminId;

//     if (!sheet_id || !collaboratorId || !["editor", "viewer"].includes(role)) {
//       return res.status(400).json({ message: "Missing or invalid input" });
//     }

//     // Fetch sheet with collaborators
//     const sheetQuery = `
//       SELECT *
//       FROM "TaskTracker".sheets
//       WHERE id = $1;
//     `;
//     const sheetResult = await pool.query(sheetQuery, [sheet_id]);

//     if (sheetResult.rowCount === 0) {
//       return res.status(404).json({ message: "Sheet not found" });
//     }

//     const sheet = sheetResult.rows[0];
//     const { createdby_id, collaborators = [] } = sheet;

//     // Only owner can update collaborators
//     if (createdby_id !== requesterId) {
//       return res
//         .status(403)
//         .json({ message: "Only the owner can update collaborators" });
//     }

//     // Update or add collaborator
//     const updatedCollaborators = Array.isArray(collaborators)
//       ? [...collaborators]
//       : [];

//     const existingIndex = updatedCollaborators.findIndex(
//       (c) => c.id === collaboratorId,
//     );
//     if (existingIndex !== -1) {
//       updatedCollaborators[existingIndex].role = role; // update role
//     } else {
//       updatedCollaborators.push({ id: collaboratorId, role });
//     }

//     // Update collaborators in DB
//     const updateQuery = `
//       UPDATE "TaskTracker".sheets
//       SET collaborators = $1::jsonb, updated_at = NOW()
//       WHERE id = $2
//       RETURNING *;
//     `;
//     const updateResult = await pool.query(updateQuery, [
//       JSON.stringify(updatedCollaborators),
//       sheet_id,
//     ]);

//     const updatedSheet = updateResult.rows[0];

//     // Invalidate sheet cache since collaborators changed
//     await invalidateSheetCache(sheet_id);

//     // Emit event to sheet participants about collaborator update
//     emitToSheetParticipants(updatedSheet, "sheet_collaborators_updated", {
//       sheet: updatedSheet,
//       message: "Sheet collaborators updated",
//     });

//     res.status(200).json({
//       message: "Collaborator updated successfully",
//       sheet: updatedSheet,
//     });
//   } catch (error) {
//     console.error("❌ Error updating collaborator:", error.message);
//     res
//       .status(500)
//       .json({ message: "Internal server error while updating collaborator" });
//   }
// };

// // Get sheets (owned/shared/all)
// export const getSheets = async (req, res) => {
//   try {
//     const org_id = req.user.companyId;
//     const user_id = req.user.userId || req.user.adminId;
//     const filter = req.query.filter || "all"; // 'owned', 'shared', or 'all'

//     // Note: We can't cache the whole list easily per filter and user with this code as is
//     // Instead, after fetching from DB, cache individual sheets separately to improve later access.

//     let getSheetsQuery = "";
//     let values = [];

//     if (filter === "owned") {
//       getSheetsQuery = `
//         SELECT * FROM "TaskTracker".sheets
//         WHERE org_id = $1 AND createdby_id = $2;
//       `;
//       values = [org_id, user_id];
//     } else if (filter === "shared") {
//       getSheetsQuery = `
//         SELECT * FROM "TaskTracker".sheets
//         WHERE org_id = $1
//           AND EXISTS (
//             SELECT 1 FROM jsonb_array_elements(collaborators) AS coll
//             WHERE coll->>'id' = $2
//           );
//       `;
//       values = [org_id, user_id];
//     } else {
//       // Get both owned and shared
//       getSheetsQuery = `
//         SELECT * FROM "TaskTracker".sheets
//         WHERE org_id = $1
//           AND (
//             createdby_id = $2
//             OR EXISTS (
//               SELECT 1 FROM jsonb_array_elements(collaborators) AS coll
//               WHERE coll->>'id' = $2
//             )
//           );
//       `;
//       values = [org_id, user_id];
//     }

//     const result = await pool.query(getSheetsQuery, values);
//     const sheets = result.rows;

//     // Cache each sheet individually
//     await Promise.all(sheets.map((sheet) => cacheSheet(sheet.id, sheet)));

//     // Determine if user is admin or normal user
//     const isUser = !!req.user.userId;
//     const creator = isUser
//       ? await User.findById(user_id).select("firstName lastName").lean()
//       : await Admin.findById(user_id).select("fullName").lean();

//     const createdByName = isUser
//       ? `${creator?.firstName || ""} ${creator?.lastName || ""}`.trim()
//       : creator?.fullName || "Unknown";

//     const populatedSheets = sheets.map((sheet) => ({
//       ...sheet,
//       createdByName,
//     }));

//     res.status(200).json({ result: populatedSheets });
//   } catch (error) {
//     console.error(`❌ Error getting sheets: ${error}`);
//     res.status(500).json({
//       message: "Internal server error in getting sheets",
//     });
//   }
// };

// export const createCells = async (req, res) => {
//   const { sheet_id, cells } = req.body;
//   const requesterId = req.user.userId || req.user.adminId;

//   if (!sheet_id || !Array.isArray(cells) || cells.length === 0) {
//     return res.status(400).json({ message: "Missing or invalid input" });
//   }

//   try {
//     // Validate access
//     const sheetResult = await pool.query(
//       `SELECT * FROM "TaskTracker".sheets WHERE id = $1`,
//       [sheet_id],
//     );

//     if (sheetResult.rowCount === 0) {
//       return res.status(404).json({ message: "Sheet not found" });
//     }

//     const sheet = sheetResult.rows[0];
//     const { createdby_id, collaborators } = sheet;

//     const isOwner = createdby_id === requesterId;
//     const isEditor =
//       Array.isArray(collaborators) &&
//       collaborators.some((c) => c.id === requesterId && c.role === "editor");

//     if (!isOwner && !isEditor) {
//       return res.status(403).json({
//         message: "Only owner or editor collaborators can modify cells",
//       });
//     }

//     // Create Redis lock keys per cell
//     const ttl = 5000; // 5s lock time
//     const lockKeys = cells.map(
//       ({ row_index, column_index }) =>
//         `locks:sheet:${sheet_id}:row:${row_index}:col:${column_index}`,
//     );

//     let locks = [];
//     try {
//       locks = await redlock.acquire(lockKeys, ttl);

//       // Upsert cells
//       const values = [];
//       const placeholders = [];

//       cells.forEach((cell, i) => {
//         const { row_index, column_index, value = null, formula = null } = cell;
//         if (typeof row_index !== "number" || typeof column_index !== "number")
//           return;

//         const idx = i * 6;
//         placeholders.push(
//           `($${idx + 1}, $${idx + 2}, $${idx + 3}, $${idx + 4}, $${idx + 5}, $${
//             idx + 6
//           })`,
//         );
//         values.push(
//           sheet_id,
//           row_index,
//           column_index,
//           value,
//           formula,
//           requesterId,
//         );
//       });

//       const upsertQuery = `
//         INSERT INTO "TaskTracker".cells (
//           sheet_id, row_index, column_index, value, formula, last_edited_by
//         )
//         VALUES ${placeholders.join(", ")}
//         ON CONFLICT (sheet_id, row_index, column_index)
//         DO UPDATE SET 
//           value = EXCLUDED.value,
//           formula = EXCLUDED.formula,
//           last_edited_by = EXCLUDED.last_edited_by,
//           updated_at = NOW()
//         RETURNING *;
//       `;

//       const result = await pool.query(upsertQuery, values);

//       // Invalidate cells cache since we modified cell data
//       await invalidateCellsCache(sheet_id);

//       emitToSheetParticipants(sheet, "cells_updated", {
//         sheetId: sheet_id,
//         updatedCells: result.rows,
//         message: `${result.rowCount} cells created/updated`,
//       });

//       res.status(201).json({
//         message: `${result.rowCount} cells created/updated successfully`,
//         cells: result.rows,
//       });
//     } catch (lockErr) {
//       console.error("🔒 Cell lock error:", lockErr);
//       return res.status(423).json({
//         message:
//           "Some cells are currently being edited. Please try again in a moment.",
//       });
//     } finally {
//       // Release all acquired locks
//       try {
//         if (Array.isArray(locks)) {
//           for (const lock of locks) await lock.release();
//         } else {
//           await locks.release();
//         }
//       } catch (releaseErr) {
//         console.warn("⚠️ Failed to release one or more locks:", releaseErr);
//       }
//     }
//   } catch (error) {
//     console.error("❌ Error creating cells:", error.message);
//     res.status(500).json({
//       message: "Internal server error while creating cells",
//     });
//   }
// };

// // Get cells with optional filtering and caching
// export const getCells = async (req, res) => {
//   try {
//     const { sheet_id, min_row, max_row, min_col, max_col } = req.query;
//     const requesterId = req.user.userId || req.user.adminId;

//     if (!sheet_id) {
//       return res.status(400).json({ message: "Missing sheet_id" });
//     }

//     // Check if user has access to this sheet
//     const accessQuery = `
//       SELECT createdby_id, collaborators
//       FROM "TaskTracker".sheets
//       WHERE id = $1
//     `;
//     const accessResult = await pool.query(accessQuery, [sheet_id]);

//     if (accessResult.rowCount === 0) {
//       return res.status(404).json({ message: "Sheet not found" });
//     }

//     const { createdby_id, collaborators } = accessResult.rows[0];

//     const hasAccess =
//       createdby_id === requesterId ||
//       (Array.isArray(collaborators) &&
//         collaborators.some((c) => c.id === requesterId));

//     if (!hasAccess) {
//       return res.status(403).json({ message: "Access denied to this sheet" });
//     }

//     // If no filters, try cache first
//     const noFilters = !min_row && !max_row && !min_col && !max_col;
//     if (noFilters) {
//       const cachedCells = await getCachedCells(sheet_id);
//       if (cachedCells) {
//         return res.status(200).json({
//           message: "Cells fetched successfully (from cache)",
//           cells: cachedCells,
//         });
//       }
//     }

//     // Build dynamic cell query
//     let query = `SELECT * FROM "TaskTracker".cells WHERE sheet_id = $1`;
//     const values = [sheet_id];
//     let index = 2;

//     if (min_row !== undefined) {
//       query += ` AND row_index >= $${index++}`;
//       values.push(Number(min_row));
//     }
//     if (max_row !== undefined) {
//       query += ` AND row_index <= $${index++}`;
//       values.push(Number(max_row));
//     }
//     if (min_col !== undefined) {
//       query += ` AND column_index >= $${index++}`;
//       values.push(Number(min_col));
//     }
//     if (max_col !== undefined) {
//       query += ` AND column_index <= $${index++}`;
//       values.push(Number(max_col));
//     }

//     query += ` ORDER BY row_index ASC, column_index ASC`;

//     const result = await pool.query(query, values);

//     const cells = result.rows;

//     // Cache only if no filters (full sheet cells)
//     if (noFilters) {
//       await cacheCells(sheet_id, cells);
//     }

//     res.status(200).json({
//       message: "Cells fetched successfully",
//       cells,
//     });
//   } catch (error) {
//     console.error("❌ Error fetching cells:", error.message);
//     res.status(500).json({
//       message: "Internal server error while fetching cells",
//     });
//   }
// };


import pool from "../init/pgConnection.js";
import User from "../models/user.model.js";
import Admin from "../models/admin.model.js";
import { emitToSheetParticipants } from "../utils/sheetEventEmit.utils.js";
import { redlock } from "../service/redisClient.service.js";
import {
  cacheSheet,
  getCachedSheet,
  invalidateSheetCache,
  cacheCells,
  getCachedCells,
  invalidateCellsCache,
} from "../service/redisCacheHelper.service.js";

// Create new sheet with unique name check for user in org
export const createSheet = async (req, res) => {
  try {
    const org_id = req.user.companyId;
    const createdby_id = req.user.userId || req.user.adminId;
    console.log("Creating sheet for org:", org_id, "by user:", createdby_id);
    if (!org_id || !createdby_id) {
      return res.status(401).json({ message: "CompanyId or userId is missing" });
    }

    const { name, collaborators = [] } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Check for existing sheet with same name for this user in this org
    const checkQuery = `
      SELECT id FROM "TaskTracker".sheets
      WHERE name = $1 AND org_id = $2 AND createdby_id = $3
      LIMIT 1;
    `;
    const checkResult = await pool.query(checkQuery, [name, org_id, createdby_id]);

    if (checkResult.rowCount > 0) {
      return res.status(409).json({ message: "Sheet with the same name already exists" });
    }

    // Insert new sheet
    const insertQuery = `
      INSERT INTO "TaskTracker".sheets (name, createdby_id, org_id, collaborators)
      VALUES ($1, $2, $3, $4::jsonb)
      RETURNING *;
    `;
    const values = [name, createdby_id, org_id, JSON.stringify(collaborators)];
    const result = await pool.query(insertQuery, values);

    const createdSheet = result.rows[0];

    // Cache the new sheet by its ID
    await cacheSheet(createdSheet.id, createdSheet);

    // Emit event to creator and collaborators
    emitToSheetParticipants(createdSheet, "sheet_created", {
      sheet: createdSheet,
      message: "New sheet created",
    });

    return res.status(201).json({
      result: createdSheet,
      message: "Sheet created successfully",
    });
  } catch (error) {
    console.error(`Error creating sheet: ${error}`);
    return res.status(500).json({
      message: "Internal server error in creating spreadsheet",
    });
  }
};

// Update collaborators and access (only creator allowed)
export const updateCollaborators = async (req, res) => {
  try {
    const { sheet_id, collaboratorId, role } = req.body;
    const requesterId = req.user.userId || req.user.adminId;

    if (!sheet_id || !collaboratorId || !["editor", "viewer"].includes(role)) {
      return res.status(400).json({ message: "Missing or invalid input" });
    }

    // Get sheet data and collaborators
    const sheetQuery = `SELECT * FROM "TaskTracker".sheets WHERE id = $1;`;
    const sheetResult = await pool.query(sheetQuery, [sheet_id]);

    if (sheetResult.rowCount === 0) {
      return res.status(404).json({ message: "Sheet not found" });
    }

    const sheet = sheetResult.rows[0];
    const { createdby_id, collaborators = [] } = sheet;

    // Only owner can update collaborators
    if (createdby_id !== requesterId) {
      return res.status(403).json({
        message: "Only the owner can update collaborators",
      });
    }

    // Clone current collaborators array
    const updatedCollaborators = Array.isArray(collaborators) ? [...collaborators] : [];

    // Find if collaborator exists
    const existingIndex = updatedCollaborators.findIndex(c => c.id === collaboratorId);

    if (existingIndex !== -1) {
      updatedCollaborators[existingIndex].role = role; // update role
    } else {
      updatedCollaborators.push({ id: collaboratorId, role });
    }

    // Update collaborators in DB
    const updateQuery = `
      UPDATE "TaskTracker".sheets
      SET collaborators = $1::jsonb, updated_at = NOW()
      WHERE id = $2
      RETURNING *;
    `;
    const updateResult = await pool.query(updateQuery, [JSON.stringify(updatedCollaborators), sheet_id]);

    const updatedSheet = updateResult.rows[0];

    // Invalidate cache for sheet since collaborators changed
    await invalidateSheetCache(sheet_id);

    // Emit event to sheet participants about update
    emitToSheetParticipants(updatedSheet, "sheet_collaborators_updated", {
      sheet: updatedSheet,
      message: "Sheet collaborators updated",
    });

    return res.status(200).json({
      message: "Collaborator updated successfully",
      sheet: updatedSheet,
    });
  } catch (error) {
    console.error("❌ Error updating collaborator:", error.message);
    return res.status(500).json({
      message: "Internal server error while updating collaborator",
    });
  }
};

// Get sheets (owned, shared, all)
export const getSheets = async (req, res) => {
  try {
    const org_id = req.user.companyId;
    const user_id = req.user.userId || req.user.adminId;
    const filter = req.query.filter || "all"; // 'owned', 'shared', 'all'

    let getSheetsQuery = "";
    let values = [];

    if (filter === "owned") {
      getSheetsQuery = `
        SELECT * FROM "TaskTracker".sheets
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
      // both owned and shared
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

    // Cache each sheet individually
    await Promise.all(sheets.map(sheet => cacheSheet(sheet.id, sheet)));

    // Populate createdByName based on user/admin
    const isUser = !!req.user.userId;
    const creator = isUser
      ? await User.findById(user_id).select("firstName lastName").lean()
      : await Admin.findById(user_id).select("fullName").lean();

    const createdByName = isUser
      ? `${creator?.firstName || ""} ${creator?.lastName || ""}`.trim()
      : creator?.fullName || "Unknown";

    const populatedSheets = sheets.map(sheet => ({
      ...sheet,
      createdByName,
    }));

    return res.status(200).json({ result: populatedSheets });
  } catch (error) {
    console.error(`❌ Error getting sheets: ${error}`);
    return res.status(500).json({
      message: "Internal server error in getting sheets",
    });
  }
};

// Create or update cells with redis locking and cache invalidation
export const createCells = async (req, res) => {
  const { sheet_id, cells } = req.body;
  const requesterId = req.user.userId || req.user.adminId;

  if (!sheet_id || !Array.isArray(cells) || cells.length === 0) {
    return res.status(400).json({ message: "Missing or invalid input" });
  }

  try {
    // Check sheet existence and collaborators
    const sheetResult = await pool.query(
      `SELECT * FROM "TaskTracker".sheets WHERE id = $1`,
      [sheet_id]
    );

    if (sheetResult.rowCount === 0) {
      return res.status(404).json({ message: "Sheet not found" });
    }

    const sheet = sheetResult.rows[0];
    const { createdby_id, collaborators } = sheet;

    const isOwner = createdby_id === requesterId;
    const isEditor =
      Array.isArray(collaborators) &&
      collaborators.some((c) => c.id === requesterId && c.role === "editor");

    if (!isOwner && !isEditor) {
      return res.status(403).json({
        message: "Only owner or editor collaborators can modify cells",
      });
    }

    // Create Redis locks per cell
    const ttl = 5000; // 5 seconds lock duration
    const lockKeys = cells.map(
      ({ row_index, column_index }) =>
        `locks:sheet:${sheet_id}:row:${row_index}:col:${column_index}`
    );

    let locks;
    try {
      locks = await redlock.acquire(lockKeys, ttl);
      locks = Array.isArray(locks) ? locks : [locks]; // Ensure array

      // Prepare upsert query
      const values = [];
      const placeholders = [];

      cells.forEach((cell, i) => {
        const { row_index, column_index, value = null, formula = null } = cell;
        if (typeof row_index !== "number" || typeof column_index !== "number") return;

        const idx = i * 6;
        placeholders.push(
          `($${idx + 1}, $${idx + 2}, $${idx + 3}, $${idx + 4}, $${idx + 5}, $${idx + 6})`
        );
        values.push(sheet_id, row_index, column_index, value, formula, requesterId);
      });

      if (placeholders.length === 0) {
        await Promise.all(
          locks.map((lock) => lock.release().catch(() => null))
        );
        return res.status(400).json({ message: "No valid cell data provided" });
      }

      const upsertQuery = `
        INSERT INTO "TaskTracker".cells
          (sheet_id, row_index, column_index, value, formula, createdby_id)
        VALUES
          ${placeholders.join(", ")}
        ON CONFLICT (sheet_id, row_index, column_index) DO UPDATE SET
          value = EXCLUDED.value,
          formula = EXCLUDED.formula,
          updated_at = NOW();
      `;

      await pool.query(upsertQuery, values);

      // Invalidate cache for sheet and cells
      await invalidateSheetCache(sheet_id);
      await invalidateCellsCache(sheet_id);

      // Get updated cells
      const updatedCellsResult = await pool.query(
        `SELECT * FROM "TaskTracker".cells WHERE sheet_id = $1 ORDER BY row_index, column_index`,
        [sheet_id]
      );
      const updatedCells = updatedCellsResult.rows;

      // Cache and notify
      await cacheCells(sheet_id, updatedCells);

      emitToSheetParticipants(sheet, "cells_updated", {
        sheet_id,
        cells: updatedCells,
        message: "Cells updated",
      });

      // Release locks
      await Promise.all(
        locks.map((lock) => lock.release().catch(() => null))
      );

      return res.status(200).json({
        message: "Cells updated successfully",
        cells: updatedCells,
      });
    } catch (lockError) {
      // Release acquired locks if any
      if (locks) {
        locks = Array.isArray(locks) ? locks : [locks];
        await Promise.all(
          locks.map((lock) => lock.release().catch(() => null))
        );
      }

      console.error("❌ Redis lock error:", lockError);
      return res.status(423).json({
        message: "Resource is locked, try again later",
      });
    }
  } catch (error) {
    console.error(`❌ Error in createCells: ${error}`);
    return res.status(500).json({
      message: "Internal server error while updating cells",
    });
  }
};


// Get cells for a sheet with caching
export const getCells = async (req, res) => {
  const { sheet_id } = req.params;

  if (!sheet_id) {
    return res.status(400).json({ message: "Missing sheet_id parameter" });
  }

  try {
    // Try cache first
    const cached = await getCachedCells(sheet_id);
    if (cached) {
      return res.status(200).json({ cells: cached, cached: true });
    }

    // Else fetch from DB
    const result = await pool.query(
      `SELECT * FROM "TaskTracker".cells WHERE sheet_id = $1 ORDER BY row_index, column_index`,
      [sheet_id]
    );

    const cells = result.rows;

    // Cache the cells
    await cacheCells(sheet_id, cells);

    return res.status(200).json({ cells, cached: false });
  } catch (error) {
    console.error(`❌ Error fetching cells: ${error}`);
    return res.status(500).json({
      message: "Internal server error while fetching cells",
    });
  }
};

export const deleteSheet = async (req, res) => {
  const { sheet_id } = req.params;
  const requesterId = req.user.userId || req.user.adminId;
console.log("Requester ID:", requesterId);
  if (!sheet_id) {
    return res.status(400).json({ message: "Missing sheet_id parameter" });
  }

  if (!requesterId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    // Fetch sheet from DB
    const sheetResult = await pool.query(
      `SELECT * FROM "TaskTracker".sheets WHERE id = $1`,
      [sheet_id]
    );

    if (sheetResult.rowCount === 0) {
      return res.status(404).json({ message: "Sheet not found" });
    }

    const sheet = sheetResult.rows[0];

    // Only owner can delete
    if (sheet.createdby_id !== requesterId) {
      return res.status(403).json({
        message: "Only the sheet owner can delete it",
      });
    }

    // Start transaction
    await pool.query("BEGIN");

    // Delete cells first
    await pool.query(
      `DELETE FROM "TaskTracker".cells WHERE sheet_id = $1`,
      [sheet_id]
    );

    // Delete sheet
    await pool.query(
      `DELETE FROM "TaskTracker".sheets WHERE id = $1`,
      [sheet_id]
    );

    // Commit transaction
    await pool.query("COMMIT");

    // Invalidate Redis cache
    await invalidateSheetCache(sheet_id);
    await invalidateCellsCache(sheet_id);

    // Emit event to participants
    emitToSheetParticipants(sheet, "sheet_deleted", {
      sheet_id,
      message: "Sheet deleted",
    });

    return res.status(200).json({ message: "Sheet deleted successfully" });
  } catch (error) {
    await pool.query("ROLLBACK");
    console.error(`❌ Error deleting sheet: ${error}`);
    return res.status(500).json({
      message: "Internal server error while deleting sheet",
    });
  }
};

