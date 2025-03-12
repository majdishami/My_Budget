
-- Optimize total income and expenses calculation using database aggregation
CREATE OR REPLACE VIEW monthly_financial_summary AS
SELECT 
    DATE_TRUNC('month', date) AS month,
    SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) AS total_income,
    SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) AS total_expense
FROM transactions
GROUP BY month
ORDER BY month DESC;

-- Optimized date range summary
CREATE OR REPLACE FUNCTION get_date_range_summary(start_date DATE, end_date DATE)
RETURNS TABLE (
    total_income NUMERIC,
    total_expense NUMERIC
) AS $$
BEGIN
    RETURN QUERY 
    SELECT 
        SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) AS total_income,
        SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) AS total_expense
    FROM transactions
    WHERE date BETWEEN start_date AND end_date;
END;
$$ LANGUAGE plpgsql;

-- Indexing transactions for faster report queries
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions (date);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions (type);

-- Ensure recurring transactions are included in reports
SELECT id, description, amount, date, type, recurring_type, is_recurring, frequency_date
FROM transactions
WHERE is_recurring = TRUE
ORDER BY date;
