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
          DATE '2025-02-01' as start_date,
          DATE '2025-02-28' as end_date
      ),
      MonthlyBills AS (
        SELECT DISTINCT ON (b.id)
          b.id as bill_id,
          b.name as bill_name,
          b.amount as bill_amount,
          b.day as bill_day,
          b.category_id,
          c.name as category_name,
          c.color as category_color,
          c.icon as category_icon,
          CASE 
            WHEN EXISTS (
              SELECT 1 FROM transactions t 
              WHERE t.category_id = b.category_id 
              AND t.amount = b.amount 
              AND t.type = 'expense'
              AND DATE_TRUNC('day', t.date::timestamp) >= (SELECT start_date FROM CurrentMonth)
              AND DATE_TRUNC('day', t.date::timestamp) <= (SELECT end_date FROM CurrentMonth)
            ) THEN 1 
            ELSE 0 
          END as paid_occurrences,
          CASE 
            WHEN EXISTS (
              SELECT 1 FROM transactions t 
              WHERE t.category_id = b.category_id 
              AND t.amount = b.amount 
              AND t.type = 'expense'
              AND DATE_TRUNC('day', t.date::timestamp) >= (SELECT start_date FROM CurrentMonth)
              AND DATE_TRUNC('day', t.date::timestamp) <= (SELECT end_date FROM CurrentMonth)
            ) THEN b.amount 
            ELSE 0 
          END as paid_amount
        FROM bills b
        JOIN categories c ON b.category_id = c.id
        WHERE b.category_id IS NOT NULL
      )
      SELECT 
        c.id as category_id,
        c.name as category_name,
        c.color as category_color,
        c.icon as category_icon,
        1 as total_bills,
        MAX(mb.paid_occurrences) as paid_count,
        1 - MAX(mb.paid_occurrences) as pending_count,
        SUM(mb.paid_amount) as paid_amount,
        SUM(mb.bill_amount - mb.paid_amount) as pending_amount,
        SUM(mb.bill_amount) as total_amount
      FROM categories c
      JOIN MonthlyBills mb ON c.id = mb.category_id
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