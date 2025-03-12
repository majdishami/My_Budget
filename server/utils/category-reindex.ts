
import pool from '../db/database';  // Ensure correct DB connection

async function reindexCategories() {
    try {
        console.log("Starting category reindexing...");

        await pool.query(`
            WITH max_id AS (SELECT MAX(id) AS max_id FROM categories)
            SELECT setval('categories_id_seq', (SELECT max_id FROM max_id));
        `);

        console.log("Category reindexing completed successfully.");
    } catch (error) {
        console.error("Error reindexing categories:", error);
    }
}

export default reindexCategories;
