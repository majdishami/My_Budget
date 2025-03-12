import express from 'express';
import path from 'path';
import { Pool } from 'pg';

const app = express();
const PORT = Number(process.env.PORT) || 3005;

// ✅ Set up the PostgreSQL pool
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'budget_tracker',
    password: 'postgres',
    port: 5432,
});

app.use(express.json());  // ✅ Enable JSON request handling

// ✅ Set Content Security Policy (CSP) Headers
app.use((req, res, next) => {
    console.log("✅ Applying CSP Headers...");
    res.setHeader(
        'Content-Security-Policy',
        "default-src 'self'; " +
        "style-src 'self' 'unsafe-inline'; " +
        "script-src 'self' 'unsafe-inline' 'unsafe-eval';"
    );
    next();
});

// ✅ Fetch Transactions (Income & Expenses)
app.get('/api/transactions', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM transactions');
        res.json(result.rows);
    } catch (error) {
        console.error('❌ Error fetching transactions:', error);
        res.status(500).json({ error: 'Failed to fetch transactions' });
    }
});

// ✅ **NEW: Fetch Bills (Expenses)**
app.get('/api/bills', async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM transactions WHERE type = 'expense'");
        res.json(result.rows);
    } catch (error) {
        console.error('❌ Error fetching bills:', error);
        res.status(500).json({ error: 'Failed to fetch bills' });
    }
});

// ✅ Health Check Route
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK' });
});

// ✅ Serve Static Files (React Build)
app.use(express.static(path.join(__dirname, '../client/dist')));

// ✅ Ensure the React App is served correctly
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist', 'index.html'));
});

// ✅ Start Server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server is running at http://localhost:${PORT}`);
    console.log('✅ Successfully connected to the database.');
});

export default app;
