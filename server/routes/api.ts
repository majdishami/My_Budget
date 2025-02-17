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
      BillOccurrences AS (
        SELECT 
          b.id as bill_id,
          b.name as bill_name,
          b.amount as bill_amount,
          b.day as bill_day,
          b.category_id,
          c.name as category_name,
          c.color as category_color,
          COALESCE(c.icon, 'circle') as category_icon,
          b.frequency,
          generate_series(1, 
            CASE 
              WHEN b.frequency = 'weekly' THEN 4
              WHEN b.frequency = 'biweekly' THEN 2
              ELSE 1
            END
          ) as occurrence_number
        FROM bills b
        JOIN categories c ON b.category_id = c.id
        WHERE b.category_id IS NOT NULL
      ),
      BillTransactions AS (
        SELECT 
          bo.*,
          EXISTS (
            SELECT 1 FROM transactions t 
            WHERE t.category_id = bo.category_id 
            AND t.amount = bo.bill_amount 
            AND t.type = 'expense'
            AND DATE_TRUNC('day', t.date::timestamp) >= (SELECT start_date FROM CurrentMonth)
            AND DATE_TRUNC('day', t.date::timestamp) <= (SELECT end_date FROM CurrentMonth)
            AND EXTRACT(DAY FROM t.date) >= 
              CASE 
                WHEN bo.frequency = 'weekly' THEN (bo.occurrence_number - 1) * 7 + 1
                WHEN bo.frequency = 'biweekly' THEN (bo.occurrence_number - 1) * 14 + 1
                ELSE bo.bill_day
              END
            AND EXTRACT(DAY FROM t.date) <= 
              CASE 
                WHEN bo.frequency = 'weekly' THEN bo.occurrence_number * 7
                WHEN bo.frequency = 'biweekly' THEN bo.occurrence_number * 14
                ELSE bo.bill_day
              END
            LIMIT 1
          ) as is_paid
        FROM BillOccurrences bo
      )
      SELECT 
        c.id as category_id,
        c.name as category_name,
        c.color as category_color,
        COALESCE(c.icon, 'circle') as category_icon,
        COUNT(bt.*) as total_bills,
        SUM(CASE WHEN bt.is_paid THEN 1 ELSE 0 END) as paid_count,
        SUM(CASE WHEN NOT bt.is_paid THEN 1 ELSE 0 END) as pending_count,
        SUM(CASE WHEN bt.is_paid THEN bt.bill_amount ELSE 0 END) as paid_amount,
        SUM(CASE WHEN NOT bt.is_paid THEN bt.bill_amount ELSE 0 END) as pending_amount,
        SUM(bt.bill_amount) as total_amount
      FROM categories c
      JOIN BillTransactions bt ON c.id = bt.category_id
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