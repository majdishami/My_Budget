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
    // Get start and end dates from query params, default to current month
    const startDate = req.query.start_date ? 
      new Date(req.query.start_date as string) : 
      new Date(new Date().getFullYear(), new Date().getMonth(), 1);

    const endDate = req.query.end_date ? 
      new Date(req.query.end_date as string) : 
      new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);

    const query = `
      WITH RECURSIVE 
      DateRange AS (
        SELECT 
          $1::date as start_date,
          $2::date as end_date
      ),
      TransactionPatterns AS (
        SELECT 
          t.category_id,
          t.amount,
          COUNT(*) as occurrence_count,
          array_agg(t.date ORDER BY t.date) as occurrence_dates
        FROM transactions t
        WHERE t.type = 'expense'
          AND t.date >= (SELECT start_date FROM DateRange)
          AND t.date <= (SELECT end_date FROM DateRange)
        GROUP BY t.category_id, t.amount
      ),
      CategoryOccurrences AS (
        SELECT 
          c.id as category_id,
          c.name as category_name,
          c.color as category_color,
          c.icon as category_icon,
          b.amount as bill_amount,
          COALESCE(tp.occurrence_count, 0) as paid_occurrences,
          CASE 
            WHEN tp.occurrence_count >= 2 THEN tp.occurrence_count  -- Use actual count if 2 or more
            WHEN tp.occurrence_count = 1 AND EXISTS (
              SELECT 1 FROM transactions t2 
              WHERE t2.category_id = c.id 
              AND t2.amount = b.amount 
              AND t2.type = 'expense'
              AND t2.date < (SELECT start_date FROM DateRange)
              AND DATE_TRUNC('month', t2.date) = DATE_TRUNC('month', (SELECT start_date FROM DateRange) - INTERVAL '1 month')
              AND EXTRACT(DAY FROM t2.date) > 15
            ) THEN 2  -- If one occurrence this month and one late last month, expect 2
            WHEN tp.occurrence_count = 1 AND (
              SELECT COUNT(*) FROM transactions t3 
              WHERE t3.category_id = c.id 
              AND t3.amount = b.amount 
              AND t3.type = 'expense'
              AND DATE_TRUNC('month', t3.date) = DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
            ) >= 2 THEN 2  -- If one occurrence this month and pattern shows 2 last month, expect 2
            ELSE 1  -- Otherwise expect 1
          END as expected_occurrences
        FROM categories c
        LEFT JOIN bills b ON c.id = b.category_id
        LEFT JOIN TransactionPatterns tp ON c.id = tp.category_id AND b.amount = tp.amount
      )
      SELECT 
        co.category_id,
        co.category_name,
        co.category_color,
        COALESCE(co.category_icon, 'circle') as category_icon,
        SUM(co.paid_occurrences) as paid_count,
        SUM(co.expected_occurrences - co.paid_occurrences) as pending_count,
        SUM(co.expected_occurrences) as total_occurrences,
        SUM(co.paid_occurrences * co.bill_amount)::numeric(10,2) as paid_amount,
        SUM((co.expected_occurrences - co.paid_occurrences) * co.bill_amount)::numeric(10,2) as pending_amount,
        SUM(co.expected_occurrences * co.bill_amount)::numeric(10,2) as total_amount
      FROM CategoryOccurrences co
      GROUP BY co.category_id, co.category_name, co.category_color, co.category_icon
      ORDER BY co.category_name;
    `;

    const results = await db.execute(sql.raw(query, [startDate, endDate]));

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
        total: Number(row.total_occurrences) || 0
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