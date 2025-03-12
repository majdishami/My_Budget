import express from 'express';
import { Pool } from 'pg';

const app = express();
const PORT = process.env.PORT || 3006;
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'budget_tracker',
    password: 'postgres',
    port: 5432,
});

app.use(express.json());  // To handle JSON bodies in requests

// Define the /api/transactions route to fetch all transactions
app.get('/api/transactions', async (req, res) => {
    console.log("API route /api/transactions hit");  // Log to confirm the route is working
    try {
        // Fetch all transactions from the database
        const result = await pool.query('SELECT * FROM transactions');
        res.json(result.rows);  // Return transactions as JSON
    } catch (error) {
        console.error('Error fetching transactions:', error);
        res.status(500).json({ error: 'Failed to fetch transactions' });
    }
});

// Health check route to ensure the server is running
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK' });
});

// Start the server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server is running at http://localhost:${PORT}`);
    console.log('✅ Successfully connected to the database.');
});

export default app;
