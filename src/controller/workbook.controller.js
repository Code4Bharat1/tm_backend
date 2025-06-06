import pool from "../init/pgConnection.js";
import User from "../models/user.model.js";
import Admin from "../models/admin.model.js";
import { emitToSheetParticipants } from "../utils/sheetEventEmit.utils.js";
import { redlock } from "../service/redisClient.service.js";
import {
  cacheWorkbooks,
  getCachedWorkbooks,
  invalidateWorkbooksCache,
} from "../service/redisCacheHelper.service.js";

// 📌 Create Workbook
export const createWorkbook = async (req, res) => {
  try {
    const org_id = req.user.companyId;
    const createdby_id = req.user.userId || req.user.adminId;
    const { name, collaborators = [] } = req.body;

    if (!name || !org_id || !createdby_id) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const duplicateCheck = await pool.query(
      `SELECT id FROM "TaskTracker".workbooks WHERE name = $1 AND org_id = $2 AND createdby_id = $3`,
      [name, org_id, createdby_id]
    );

    if (duplicateCheck.rowCount > 0) {
      return res.status(409).json({ message: "Workbook with this name already exists" });
    }

    const result = await pool.query(
      `INSERT INTO "TaskTracker".workbooks (name, org_id, createdby_id, collaborators)
       VALUES ($1, $2, $3, $4::jsonb)
       RETURNING *;`,
      [name, org_id, createdby_id, JSON.stringify(collaborators)]
    );

    await invalidateWorkbooksCache(org_id, createdby_id);

    res.status(201).json({
      message: "Workbook created successfully",
      workbook: result.rows[0],
    });
  } catch (error) {
    console.error("❌ Error creating workbook:", error.message);
    res.status(500).json({ message: "Internal server error while creating workbook" });
  }
};

// 📌 Get Workbooks
export const getWorkbooks = async (req, res) => {
  try {
    const org_id = req.user.companyId;
    const user_id = req.user.userId || req.user.adminId;

    const cached = await getCachedWorkbooks(org_id, user_id);
    if (cached) {
      return res.status(200).json({
        message: "Workbooks fetched from cache",
        workbooks: cached,
      });
    }

    const query = `
      SELECT * FROM "TaskTracker".workbooks
      WHERE org_id = $1
      AND (
        createdby_id = $2 OR
        EXISTS (
          SELECT 1 FROM jsonb_array_elements(collaborators) AS coll
          WHERE coll->>'id' = $2
        )
      )
      ORDER BY created_at DESC;
    `;

    const result = await pool.query(query, [org_id, user_id]);

    await cacheWorkbooks(org_id, user_id, result.rows);

    res.status(200).json({
      message: "Workbooks fetched successfully",
      workbooks: result.rows,
    });
  } catch (error) {
    console.error("❌ Error fetching workbooks:", error.message);
    res.status(500).json({ message: "Internal server error while fetching workbooks" });
  }
};

// 📌 Update Workbook
export const updateWorkbook = async (req, res) => {
  const { workbook_id, name, collaborators } = req.body;
  const requesterId = req.user.userId || req.user.adminId;

  if (!workbook_id) {
    return res.status(400).json({ message: "Workbook ID is required" });
  }

  try {
    const check = await pool.query(
      `SELECT * FROM "TaskTracker".workbooks WHERE id = $1`,
      [workbook_id]
    );

    if (check.rowCount === 0) {
      return res.status(404).json({ message: "Workbook not found" });
    }

    const workbook = check.rows[0];

    if (workbook.createdby_id !== requesterId) {
      return res.status(403).json({ message: "Only the owner can update the workbook" });
    }

    const updateQuery = `
      UPDATE "TaskTracker".workbooks
      SET
        name = COALESCE($1, name),
        collaborators = COALESCE($2::jsonb, collaborators)
      WHERE id = $3
      RETURNING *;
    `;

    const result = await pool.query(updateQuery, [
      name || null,
      collaborators ? JSON.stringify(collaborators) : null,
      workbook_id,
    ]);

    await invalidateWorkbooksCache(workbook.org_id, requesterId);

    res.status(200).json({
      message: "Workbook updated successfully",
      workbook: result.rows[0],
    });
  } catch (error) {
    console.error("❌ Error updating workbook:", error.message);
    res.status(500).json({ message: "Internal server error while updating workbook" });
  }
};

// 📌 Delete Workbook
export const deleteWorkbook = async (req, res) => {
  const { workbook_id } = req.params;
  const requesterId = req.user.userId || req.user.adminId;

  if (!workbook_id) {
    return res.status(400).json({ message: "Workbook ID is required" });
  }

  try {
    const check = await pool.query(
      `SELECT * FROM "TaskTracker".workbooks WHERE id = $1`,
      [workbook_id]
    );

    if (check.rowCount === 0) {
      return res.status(404).json({ message: "Workbook not found" });
    }

    const workbook = check.rows[0];

    if (workbook.createdby_id !== requesterId) {
      return res.status(403).json({ message: "Unauthorized to delete workbook" });
    }

    await pool.query(
      `DELETE FROM "TaskTracker".workbooks WHERE id = $1`,
      [workbook_id]
    );

    await invalidateWorkbooksCache(workbook.org_id, requesterId);

    res.status(200).json({ message: "Workbook deleted successfully" });
  } catch (error) {
    console.error("❌ Error deleting workbook:", error.message);
    res.status(500).json({ message: "Internal server error while deleting workbook" });
  }
};

export {
  createWorkbook,
  getWorkbooks,
  updateWorkbook,
  deleteWorkbook,
};
