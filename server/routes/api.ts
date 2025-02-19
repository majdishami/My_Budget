import { Router } from 'express';
import { db } from '@db';
import { sql } from 'drizzle-orm';
import { reindexCategories } from '../utils/category-reindex';

const router = Router();

// Add reindex endpoint
router.post('/api/categories/reindex', async (req, res) => {
  try {
    console.log('Starting category reindexing process...');
    const result = await reindexCategories();
    console.log('Reindexing completed:', result);
    res.json(result);
  } catch (error) {
    console.error('Failed to reindex categories:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to reindex categories',
      details: error instanceof Error ? error.stack : undefined
    });
  }
});

// Expense report endpoint with date range support
router.get('/api/reports/expenses', async (req, res) => {
  try {
    // Get start and end dates from query params
    const startDate = req.query.start_date ? 
      new Date(req.query.start_date as string) : 
      new Date(new Date().getFullYear(), new Date().getMonth(), 1);

    const endDate = req.query.end_date ? 
      new Date(req.query.end_date as string) : 
      new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);

    // Query for both one-time and recurring expenses
    const query = `
      WITH RECURSIVE 
      date_series AS (
        SELECT $1::date as dt
        UNION ALL
        SELECT dt + interval '1 day'
        FROM date_series
        WHERE dt < $2::date
      ),
      recurring_expenses AS (
        SELECT 
          b.id,
          b.name,
          b.amount,
          b.category_id,
          c.name as category_name,
          c.color as category_color,
          c.icon as category_icon,
          CASE 
            WHEN b.day IS NOT NULL THEN 
              (SELECT dt::date 
               FROM date_series 
               WHERE EXTRACT(DAY FROM dt) = b.day)
            ELSE b.date::date
          END as expense_date
        FROM bills b
        JOIN categories c ON b.category_id = c.id
        WHERE 
          (b.day IS NOT NULL AND 
           EXISTS (SELECT 1 FROM date_series WHERE EXTRACT(DAY FROM dt) = b.day))
          OR 
          (b.date IS NOT NULL AND b.date BETWEEN $1 AND $2)
      )
      SELECT 
        id,
        name as description,
        amount,
        expense_date as date,
        category_name,
        category_color,
        COALESCE(category_icon, 'circle') as category_icon,
        'expense' as type
      FROM recurring_expenses
      WHERE expense_date IS NOT NULL
      ORDER BY expense_date, name;
    `;

    const result = await db.execute(sql.raw(query, [startDate, endDate]));

    const expenses = result.rows.map(row => ({
      id: row.id,
      date: row.date,
      description: row.description,
      amount: Number(row.amount),
      type: row.type,
      category_name: row.category_name,
      category_color: row.category_color,
      category_icon: row.category_icon || 'circle'
    }));

    res.json(expenses);
  } catch (error) {
    console.error('Error generating expense report:', error);
    res.status(500).json({ 
      error: 'Failed to generate expense report',
      details: error instanceof Error ? error.stack : undefined
    });
  }
});

export default router;