import { Router } from 'express';
import { db } from '@db';
import { sql } from 'drizzle-orm';

const router = Router();

router.get('/api/reports/expenses', async (req, res) => {
  try {
    const query = `
      WITH RECURSIVE 
      CurrentMonth AS (
        SELECT date_trunc('month', CURRENT_DATE) as start_date,
               date_trunc('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day' as end_date
      ),
      BillTransactions AS (
        SELECT 
          b.id as bill_id,
          b.name as bill_name,
          b.amount as bill_amount,
          b.day as bill_day,
          b.category_id,
          c.name as category_name,
          c.color as category_color,
          c.icon as category_icon,
          t.id as transaction_id,
          t.amount as transaction_amount,
          t.date as transaction_date
        FROM bills b
        JOIN categories c ON b.category_id = c.id
        LEFT JOIN LATERAL (
          SELECT t.id, t.amount, t.date
          FROM transactions t
          WHERE t.category_id = b.category_id 
          AND t.amount = b.amount
          AND t.type = 'expense'
          AND t.date >= (SELECT start_date FROM CurrentMonth)
          AND t.date <= (SELECT end_date FROM CurrentMonth)
          ORDER BY ABS(EXTRACT(DAY FROM t.date) - b.day)
          LIMIT 1
        ) t ON true
      )
      SELECT 
        c.id as category_id,
        c.name as category_name,
        c.color as category_color,
        c.icon as category_icon,
        COUNT(DISTINCT bt.bill_id) as total_bills,
        COUNT(DISTINCT CASE WHEN bt.transaction_id IS NOT NULL THEN bt.bill_id END) as paid_count,
        COUNT(DISTINCT CASE WHEN bt.transaction_id IS NULL THEN bt.bill_id END) as pending_count,
        COALESCE(SUM(CASE WHEN bt.transaction_id IS NOT NULL THEN bt.bill_amount ELSE 0 END), 0) as paid_amount,
        COALESCE(SUM(CASE WHEN bt.transaction_id IS NULL THEN bt.bill_amount ELSE 0 END), 0) as pending_amount,
        COALESCE(SUM(bt.bill_amount), 0) as total_amount
      FROM categories c
      LEFT JOIN BillTransactions bt ON c.id = bt.category_id
      GROUP BY c.id, c.name, c.color, c.icon
      HAVING COUNT(DISTINCT bt.bill_id) > 0
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
        paid: Number(row.paid_count),
        pending: Number(row.pending_count),
        total: Number(row.total_bills)
      },
      amounts: {
        paid: Number(row.paid_amount),
        pending: Number(row.pending_amount),
        total: Number(row.total_amount)
      }
    }));

    res.json(expenseReport);
  } catch (error) {
    console.error('Error generating expense report:', error);
    res.status(500).json({ error: 'Failed to generate expense report' });
  }
});

export default router;