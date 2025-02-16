// Import statements remain unchanged

router.get('/api/reports/expenses', async (req, res) => {
  try {
    const query = `
      WITH CurrentMonthData AS (
        SELECT 
          b.id as bill_id,
          b.name as bill_name,
          b.amount as bill_amount,
          b.day as bill_day,
          b.category_id,
          (
            SELECT t.id
            FROM transactions t
            WHERE t.category_id = b.category_id 
            AND t.amount = b.amount
            AND DATE_PART('month', t.date::timestamp) = DATE_PART('month', CURRENT_DATE)
            AND DATE_PART('year', t.date::timestamp) = DATE_PART('year', CURRENT_DATE)
            ORDER BY ABS(DATE_PART('day', t.date::timestamp) - b.day)
            LIMIT 1
          ) as matched_transaction_id
        FROM bills b
      )
      SELECT 
        c.id as category_id,
        c.name as category_name,
        c.color as category_color,
        c.icon as category_icon,
        COUNT(DISTINCT cmd.bill_id) as total_bills,
        COUNT(DISTINCT cmd.matched_transaction_id) as paid_count,
        COUNT(DISTINCT CASE WHEN cmd.matched_transaction_id IS NULL THEN cmd.bill_id END) as pending_count,
        COALESCE(SUM(CASE WHEN cmd.matched_transaction_id IS NOT NULL THEN cmd.bill_amount ELSE 0 END), 0) as paid_amount,
        COALESCE(SUM(CASE WHEN cmd.matched_transaction_id IS NULL THEN cmd.bill_amount ELSE 0 END), 0) as pending_amount,
        COALESCE(SUM(cmd.bill_amount), 0) as total_amount
      FROM categories c
      LEFT JOIN CurrentMonthData cmd ON c.id = cmd.category_id
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
