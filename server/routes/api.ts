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

// Expense report endpoint with occurrence tracking based on actual transactions
router.get('/api/reports/expenses', async (req, res) => {
  try {
    const query = `
      WITH RECURSIVE 
      DateRange AS (
        SELECT 
          DATE_TRUNC('month', CURRENT_DATE) as start_date,
          (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month - 1 day')::date as end_date
      ),
      ActualTransactions AS (
        SELECT 
          t.category_id,
          t.amount,
          COUNT(*) as occurrence_count,
          SUM(t.amount) as paid_amount
        FROM transactions t
        WHERE t.type = 'expense'
          AND DATE_TRUNC('month', t.date) = (SELECT start_date FROM DateRange)
        GROUP BY t.category_id, t.amount
      ),
      ExpectedOccurrences AS (
        SELECT 
          b.category_id,
          b.amount,
          COUNT(*) as expected_occurrences
        FROM bills b
        GROUP BY b.category_id, b.amount
      )
      SELECT 
        c.id as category_id,
        c.name as category_name,
        c.color as category_color,
        COALESCE(c.icon, 'circle') as category_icon,
        COALESCE(at.occurrence_count, 0) as paid_count,
        COALESCE(eo.expected_occurrences - COALESCE(at.occurrence_count, 0), 0) as pending_count,
        COALESCE(eo.expected_occurrences, 0) as total_occurrences,
        COALESCE(at.paid_amount, 0)::numeric(10,2) as paid_amount,
        COALESCE((eo.expected_occurrences - COALESCE(at.occurrence_count, 0)) * b.amount, 0)::numeric(10,2) as pending_amount,
        COALESCE(eo.expected_occurrences * b.amount, 0)::numeric(10,2) as total_amount
      FROM categories c
      LEFT JOIN bills b ON c.id = b.category_id
      LEFT JOIN ActualTransactions at ON c.id = at.category_id AND at.amount = b.amount
      LEFT JOIN ExpectedOccurrences eo ON c.id = eo.category_id AND eo.amount = b.amount
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