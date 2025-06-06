import pool from '../init/pgConnection.js';

export const createSchemaAndTables = async () => {
    try {
        // Create schema
        await pool.query(`CREATE SCHEMA IF NOT EXISTS "TaskTracker";`);

        // Create workbooks table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS "TaskTracker".workbooks (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                name TEXT NOT NULL,
                org_id TEXT NOT NULL,
                createdby_id TEXT NOT NULL,
                collaborators JSONB DEFAULT '[]',
                created_at TIMESTAMPTZ DEFAULT NOW()
            );
        `);

        // Create sheets table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS "TaskTracker".sheets (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                workbook_id UUID REFERENCES "TaskTracker".workbooks(id) ON DELETE CASCADE,
                name TEXT NOT NULL,
                createdby_id TEXT NOT NULL,
                org_id TEXT NOT NULL,
                collaborators JSONB DEFAULT '[]',
                created_at TIMESTAMPTZ DEFAULT NOW(),
                UNIQUE(workbook_id, name)
            );
        `);

        // Create cells table (based on your image)
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

        console.log("✅ PostgreSQL schema initialized: TaskTracker");

    } catch (error) {
        console.error("❌ Error initializing schema and tables:", error.message);
    }
};
