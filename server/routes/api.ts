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
      DateRange AS MATERIALIZED (
        SELECT 
          DATE_TRUNC('month', CURRENT_DATE) as start_date,
          (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month - 1 day')::date as end_date
      ),
      MonthDates AS MATERIALIZED (
        SELECT generate_series(
          (SELECT start_date FROM DateRange),
          (SELECT end_date FROM DateRange),
          '1 day'::interval
        )::date as date
      ),
      BillDates AS MATERIALIZED (
        SELECT 
          b.id as bill_id,
          b.name as bill_name,
          b.amount as bill_amount,
          b.category_id,
          c.name as category_name,
          c.color as category_color,
          c.icon as category_icon,
          d.date as due_date,
          EXTRACT(day from d.date) as day_of_month
        FROM bills b
        CROSS JOIN MonthDates d
        JOIN categories c ON b.category_id = c.id
        WHERE EXTRACT(day from d.date) = b.day
      ),
      TransactionMatches AS MATERIALIZED (
        SELECT 
          bd.*,
          COALESCE(
            EXISTS (
              SELECT 1 
              FROM transactions t 
              WHERE t.category_id = bd.category_id
              AND t.amount = bd.bill_amount
              AND t.type = 'expense'
              AND DATE_TRUNC('day', t.date) = bd.due_date
            ),
            false
          ) as is_paid
        FROM BillDates bd
      )
      SELECT 
        c.id as category_id,
        c.name as category_name,
        c.color as category_color,
        COALESCE(c.icon, 'circle') as category_icon,
        COUNT(DISTINCT tm.bill_id) as total_bills,
        COUNT(DISTINCT CASE WHEN tm.is_paid THEN tm.bill_id END) as paid_bills,
        COUNT(DISTINCT CASE WHEN NOT tm.is_paid THEN tm.bill_id END) as pending_bills,
        COALESCE(SUM(CASE WHEN tm.is_paid THEN 1 END), 0) as paid_count,
        COALESCE(SUM(CASE WHEN NOT tm.is_paid THEN 1 END), 0) as pending_count,
        COALESCE(SUM(CASE WHEN tm.is_paid THEN tm.bill_amount END), 0)::numeric(10,2) as paid_amount,
        COALESCE(SUM(CASE WHEN NOT tm.is_paid THEN tm.bill_amount END), 0)::numeric(10,2) as pending_amount,
        COALESCE(SUM(tm.bill_amount), 0)::numeric(10,2) as total_amount
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
        icon: row.category_icon || 'circle'
      },
      occurrences: {
        paid: Number(row.paid_count) || 0,
        pending: Number(row.pending_count) || 0,
        total: (Number(row.paid_count) || 0) + (Number(row.pending_count) || 0)
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