import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pkg from 'pg';

dotenv.config();

const { Client } = pkg;
const app = express();

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: false, // explicitly disable SSL for local PostgreSQL
});

client.connect()
  .then(() => {
    console.log('✅ Successfully connected to the database.');
  })
  .catch((err) => {
    console.error('❌ Database connection failed:', err);
  });

app.use(cors());
app.use(express.json());

// 👇 Added a root route
app.get('/', (req, res) => {
  res.send('🎉 Your app is running successfully!');
});

const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
  console.log(`🚀 Server is running at http://0.0.0.0:${PORT}`);
});
