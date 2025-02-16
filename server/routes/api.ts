import { Router } from 'express';
import { db } from '@db';
import { sql } from 'drizzle-orm';

const router = Router();

router.get('/api/reports/expenses', async (req, res) => {
  try {
    const query = `
      WITH RECURSIVE 
      CurrentMonth AS (
        SELECT 
          date_trunc('month', CURRENT_DATE) as start_date,
          date_trunc('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day' as end_date
      ),
      MonthlyBills AS (
        SELECT DISTINCT ON (b.id, b.category_id)
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
        LEFT JOIN transactions t ON 
          t.category_id = b.category_id 
          AND t.amount = b.amount
          AND t.type = 'expense'
          AND t.date >= (SELECT start_date FROM CurrentMonth)
          AND t.date <= (SELECT end_date FROM CurrentMonth)
        WHERE b.category_id IS NOT NULL
        ORDER BY b.id, b.category_id, t.date
      )
      SELECT 
        c.id as category_id,
        c.name as category_name,
        c.color as category_color,
        c.icon as category_icon,
        1 as total_bills,
        COUNT(DISTINCT CASE WHEN mb.transaction_id IS NOT NULL THEN mb.bill_id END) as paid_count,
        CASE WHEN COUNT(DISTINCT CASE WHEN mb.transaction_id IS NOT NULL THEN mb.bill_id END) = 0 THEN 1 ELSE 0 END as pending_count,
        COALESCE(SUM(CASE WHEN mb.transaction_id IS NOT NULL THEN mb.bill_amount ELSE 0 END), 0) as paid_amount,
        COALESCE(SUM(CASE WHEN mb.transaction_id IS NULL THEN mb.bill_amount ELSE 0 END), 0) as pending_amount,
        mb.bill_amount as total_amount
      FROM categories c
      JOIN MonthlyBills mb ON c.id = mb.category_id
      GROUP BY c.id, c.name, c.color, c.icon, mb.bill_amount
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