import pool from '../../db/database';  
import { Request, Response } from 'express'; 

export async function getTransactions(req: Request, res: Response) {
    try {
        const currentMonth = new Date().getMonth() + 1;  // Get current month (1-12)
        const currentYear = new Date().getFullYear();    // Get current year

        // Check if transactions for the current month already exist
        const checkQuery = `
            SELECT COUNT(*) FROM transactions 
            WHERE type = 'expense' 
            AND EXTRACT(MONTH FROM date) = $1 
            AND EXTRACT(YEAR FROM date) = $2;
        `;
        const { rows } = await pool.query(checkQuery, [currentMonth, currentYear]);

        if (rows[0].count > 0) {
            console.log(`Transactions for ${currentMonth}/${currentYear} already exist.`);
        } else {
            console.log(`Generating new transactions for ${currentMonth}/${currentYear}...`);

            // Insert transactions from bills for the current month
            const insertQuery = `
                INSERT INTO transactions (description, amount, date, type, category_id)
                SELECT 
                    name AS description, 
                    amount, 
                    make_date($2, $1, 
                        CASE 
                            WHEN name ILIKE '%rent%' THEN 1
                            WHEN name ILIKE '%credit card%' THEN 5
                            WHEN name ILIKE '%groceries%' THEN 15
                            WHEN name ILIKE '%loan%' THEN 20
                            ELSE reminder_days -- Default to assigned day
                        END
                    ) AS date, 
                    'expense' AS type, 
                    category_id
                FROM bills
                WHERE occurrence = 'monthly';
            `;
            await pool.query(insertQuery, [currentMonth, currentYear]);
        }

        // Fetch and return all transactions (incomes + expenses)
        const transactionsQuery = `
            SELECT id, description, amount, date, type, category_id
            FROM transactions
            WHERE EXTRACT(MONTH FROM date) = $1 
            AND EXTRACT(YEAR FROM date) = $2;
        `;
        const { rows: transactions } = await pool.query(transactionsQuery, [currentMonth, currentYear]);

        res.json(transactions);
    } catch (error) {
        console.error("Error fetching transactions", error);
        res.status(500).json({ error: "Failed to fetch transactions" });
    }
}
