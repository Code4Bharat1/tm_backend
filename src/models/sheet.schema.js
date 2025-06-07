import pool from '../init/pgConnection.js';

export const createSchemaAndTables = async () => {
  try {
    // Create schema
    await pool.query(`CREATE SCHEMA IF NOT EXISTS "TaskTracker";`);

    // Create sheets table if not exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "TaskTracker".sheets (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        createdby_id TEXT NOT NULL,
        name TEXT NOT NULL,
        org_id TEXT NOT NULL,
        collaborators JSONB DEFAULT '[]',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Remove workbook_id column from sheets if it exists
    const columnCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'TaskTracker' AND table_name = 'sheets' AND column_name = 'workbook_id';
    `);

    if (columnCheck.rowCount > 0) {
      console.log('🛠 Removing workbook_id column from TaskTracker.sheets');
      await pool.query(`ALTER TABLE "TaskTracker".sheets DROP COLUMN workbook_id;`);
    }

    // Create cells table if not exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "TaskTracker".cells (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        sheet_id UUID NOT NULL REFERENCES "TaskTracker".sheets(id) ON DELETE CASCADE,
        row_index INTEGER NOT NULL,
        column_index INTEGER NOT NULL,
        value TEXT,
        formula TEXT,
        last_edited_by TEXT,
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(sheet_id, row_index, column_index)
      );
    `);

    console.log("✅ PostgreSQL schema updated: TaskTracker (sheets and cells)");

  } catch (error) {
    console.error("❌ Error updating schema and tables:", error.message);
  }
};
