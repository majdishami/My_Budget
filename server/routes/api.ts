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

// Optimized expense report endpoint using materialized CTEs and indexes
router.get('/api/reports/expenses', async (req, res) => {
  try {
    const query = `
      WITH RECURSIVE 
      CurrentMonth AS MATERIALIZED (
        SELECT 
          DATE_TRUNC('month', CURRENT_DATE) as start_date,
          (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month - 1 day')::date as end_date
      ),
      BillOccurrences AS MATERIALIZED (
        SELECT 
          b.id as bill_id,
          b.name as bill_name,
          b.amount::numeric(10,2) as bill_amount,
          b.day as bill_day,
          b.category_id,
          c.name as category_name,
          c.color as category_color,
          COALESCE(c.icon, 'circle') as category_icon
        FROM bills b
        JOIN categories c ON b.category_id = c.id
        WHERE b.category_id IS NOT NULL
      ),
      TransactionMatches AS MATERIALIZED (
        SELECT 
          bo.*,
          EXISTS (
            SELECT 1 FROM transactions t 
            WHERE t.category_id = bo.category_id 
            AND t.amount = bo.bill_amount 
            AND t.type = 'expense'
            AND DATE_TRUNC('month', t.date::timestamp) = (SELECT DATE_TRUNC('month', start_date) FROM CurrentMonth)
            AND EXTRACT(DAY FROM t.date) = bo.bill_day
          ) as is_paid
        FROM BillOccurrences bo
      )
      SELECT 
        c.id as category_id,
        c.name as category_name,
        c.color as category_color,
        COALESCE(c.icon, 'circle') as category_icon,
        COUNT(tm.*) as total_bills,
        SUM(CASE WHEN tm.is_paid THEN 1 ELSE 0 END) as paid_count,
        SUM(CASE WHEN NOT tm.is_paid THEN 1 ELSE 0 END) as pending_count,
        SUM(CASE WHEN tm.is_paid THEN tm.bill_amount ELSE 0 END)::numeric(10,2) as paid_amount,
        SUM(CASE WHEN NOT tm.is_paid THEN tm.bill_amount ELSE 0 END)::numeric(10,2) as pending_amount,
        SUM(tm.bill_amount)::numeric(10,2) as total_amount
      FROM categories c
      LEFT JOIN TransactionMatches tm ON c.id = tm.category_id
      GROUP BY c.id, c.name, c.color, c.icon
      ORDER BY c.name;
    `;

    const results = await db.execute(sql.raw(query));

    const expenseReport = results.rows.map(row => ({
      category: {
        id: row.category_id,
        name: row.category_name,
        color: row.category_color,
        icon: row.category_icon
      },
      occurrences: {
        paid: Number(row.paid_count) || 0,
        pending: Number(row.pending_count) || 0,
        total: Number(row.total_bills) || 0
      },
      amounts: {
        paid: Number(row.paid_amount) || 0,
        pending: Number(row.pending_amount) || 0,
        total: Number(row.total_amount) || 0
      }
    }));

    res.json(expenseReport);
  } catch (error) {
    console.error('Error generating expense report:', error);
    res.status(500).json({ error: 'Failed to generate expense report' });
  }
});

export default router;