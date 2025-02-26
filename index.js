import express from 'express';
import sequelize from './sequelize.js';
import Category from './models/Category.js';
import Bill from './models/Bill.js';
import Transaction from './models/Transaction.js';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Routes
app.get('/', (req, res) => {
  res.send('Hello World!');
});

// Sync database and create tables
sequelize.sync({ force: true }).then(async () => {
  console.log('Database & tables created!');

  // Insert data into categories table
  await Category.bulkCreate([
    { id: 1, name: 'Rent', color: '#3B82F6', icon: 'home' },
    { id: 2, name: 'Groceries', color: '#10B981', icon: 'shopping-cart' },
    { id: 3, name: 'Personal Loan', color: '#6366F1', icon: 'credit-card' },
    { id: 4, name: 'Car Insurance', color: '#F59E0B', icon: 'car' },
    { id: 5, name: 'Maid\'s Service', color: '#EC4899', icon: 'home' },
    { id: 6, name: 'Credit Card Payments', color: '#8B5CF6', icon: 'credit-card' },
    { id: 7, name: 'Utilities - Electricity', color: '#F97316', icon: 'zap' },
    { id: 8, name: 'Utilities - Gas', color: '#EF4444', icon: 'flame' },
    { id: 9, name: 'Utilities - Water', color: '#3B82F6', icon: 'droplet' },
    { id: 10, name: 'TV Service', color: '#8B5CF6', icon: 'tv' },
    { id: 11, name: 'Internet', color: '#2563EB', icon: 'wifi' },
    { id: 12, name: 'Online Services', color: '#6366F1', icon: 'globe' },
    { id: 13, name: 'Life Insurance', color: '#059669', icon: 'heart' },
    { id: 14, name: 'Others', color: '#71717A', icon: 'more-horizontal' },
    { id: 15, name: 'Phone', color: '#32af37', icon: 'phone' },
    { id: 17, name: 'General Expenses', color: '#6366F1', icon: 'shopping-cart' },
    { id: 29, name: 'Utilities', color: '#e91515', icon: 'House-Plug' },
    { id: 30, name: 'Insurances', color: '#ca6464', icon: 'alarm-smoke' },
  ]);

  // Insert data into bills table
  await Bill.bulkCreate([
    { id: 2, name: 'ATT Phone Bill ($115 Rund Roaming)', amount: 429, day: 1, category_id: 15, is_one_time: false, is_yearly: false, reminder_enabled: false, reminder_days: 7 },
    { id: 3, name: 'Maid Service - Beginning of Month Payment', amount: 120, day: 1, category_id: 5, is_one_time: false, is_yearly: false, reminder_enabled: false, reminder_days: 7 },
    { id: 4, name: 'Rent', amount: 3750, day: 1, category_id: 1, is_one_time: false, is_yearly: false, reminder_enabled: false, reminder_days: 7 },
    { id: 5, name: 'Sling TV (CC 9550)', amount: 75, day: 3, category_id: 10, is_one_time: false, is_yearly: false, reminder_enabled: false, reminder_days: 7 },
    { id: 6, name: 'Cox Internet', amount: 81, day: 6, category_id: 11, is_one_time: false, is_yearly: false, reminder_enabled: false, reminder_days: 7 },
    { id: 7, name: 'Water Bill', amount: 80, day: 7, category_id: 9, is_one_time: false, is_yearly: false, reminder_enabled: false, reminder_days: 7 },
    { id: 8, name: 'NV Energy Electrical ($100 winter months)', amount: 250, day: 7, category_id: 7, is_one_time: false, is_yearly: false, reminder_enabled: false, reminder_days: 7 },
    { id: 9, name: 'TransAmerica Life Insurance', amount: 77, day: 9, category_id: 13, is_one_time: false, is_yearly: false, reminder_enabled: false, reminder_days: 7 },
    { id: 10, name: 'Credit Card minimum payments', amount: 225, day: 14, category_id: 6, is_one_time: false, is_yearly: false, reminder_enabled: false, reminder_days: 7 },
    { id: 11, name: 'Apple/Google/YouTube (CC 9550)', amount: 130, day: 14, category_id: 12, is_one_time: false, is_yearly: false, reminder_enabled: false, reminder_days: 7 },
    { id: 12, name: 'Expenses & Groceries charged on (CC 2647)', amount: 3000, day: 16, category_id: 2, is_one_time: false, is_yearly: false, reminder_enabled: false, reminder_days: 7 },
    { id: 13, name: 'Maid Service - Mid-Month Payment', amount: 120, day: 17, category_id: 5, is_one_time: false, is_yearly: false, reminder_enabled: false, reminder_days: 7 },
    { id: 14, name: 'SoFi Personal Loan', amount: 1915, day: 17, category_id: 3, is_one_time: false, is_yearly: false, reminder_enabled: false, reminder_days: 7 },
    { id: 15, name: 'Southwest Gas ($200 in winter/$45 in summer)', amount: 75, day: 17, category_id: 8, is_one_time: false, is_yearly: false, reminder_enabled: false, reminder_days: 7 },
    { id: 16, name: 'Car Insurance for 3 cars ($268 + $169 + $303 + $21)', amount: 704, day: 28, category_id: 4, is_one_time: false, is_yearly: false, reminder_enabled: false, reminder_days: 7 },
  ]);

  // Insert data into transactions table
  await Transaction.bulkCreate([
    { description: 'Water Bill', amount: 80, date: '2025-02-06T00:00:00.000Z', type: 'expense', category_id: 29, created_at: '2025-02-14T07:01:56.328Z', is_recurring: false },
    { description: 'NV Energy Electrical ($100 winter months)', amount: 250, date: '2025-02-06T00:00:00.000Z', type: 'expense', category_id: 29, created_at: '2025-02-14T07:01:56.328Z', is_recurring: false },
    { description: 'Rent', amount: 3750, date: '2025-02-01T00:00:00.000Z', type: 'expense', category_id: 1, created_at: '2025-02-14T07:01:56.328Z', is_recurring: false },
    { description: 'Groceries & Others charged on (CC 2647)', amount: 3000, date: '2025-02-16T00:00:00.000Z', type: 'expense', category_id: 2, created_at: '2025-02-14T07:01:56.328Z', is_recurring: false },
    { description: 'AT&T (+$115 Rund Roaming)', amount: 429, date: '2025-02-01T00:00:00.000Z', type: 'expense', category_id: 15, created_at: '2025-02-14T07:01:56.328Z', is_recurring: false },
    { description: 'maid\'s 2nd Monthly Payment', amount: 120, date: '2025-02-17T00:00:00.000Z', type: 'expense', category_id: 5, created_at: '2025-02-14T07:01:56.328Z', is_recurring: false },
    { description: 'maid\'s 1st monthly payment', amount: 120, date: '2025-02-01T00:00:00.000Z', type: 'expense', category_id: 5, created_at: '2025-02-14T07:01:56.328Z', is_recurring: false },
    { description: 'test monthly income 1', amount: 1, date: '2025-02-28T00:00:00.000Z', type: 'income', category_id: null, created_at: '2025-02-19T19:52:23.889Z', recurring_type: 'monthly', is_recurring: true },
    { description: 'Sling TV (CC 9550)', amount: 75, date: '2025-02-02T00:00:00.000Z', type: 'expense', category_id: 10, created_at: '2025-02-14T07:01:56.328Z', is_recurring: false },
    { description: 'Cox Internet', amount: 81, date: '2025-02-05T00:00:00.000Z', type: 'expense', category_id: 11, created_at: '2025-02-14T07:01:56.328Z', is_recurring: false },
    { description: 'Credit Card minimum payments', amount: 225, date: '2025-02-13T00:00:00.000Z', type: 'expense', category_id: 6, created_at: '2025-02-14T07:01:56.328Z', is_recurring: false },
    { description: 'Apple/Google/YouTube (CC 9550)', amount: 130, date: '2025-02-13T00:00:00.000Z', type: 'expense', category_id: 12, created_at: '2025-02-14T07:01:56.328Z', is.recurring: false },
    { description: 'SoFi Personal Loan', amount: 1915, date: '2025-02-17T00:00:00.000Z', type: 'expense', category_id: 3, created.at: '2025-02-14T07:01:56.328Z', is.recurring: false },
    { description: 'Car Insurance for 3 cars ($268 + $169 + $303 + $21)', amount: 704, date: '2025-02-27T00:00:00.000Z', type: 'expense', category_id: 4, created.at: '2025-02-14T07:01:56.328Z', is.recurring: false },
    { description: 'Southwest Gas ($200 in winter/$45 in summer)', amount: 75, date: '2025-02-17T00:00:00.000Z', type: 'expense', category_id: 8, created.at: '2025-02-14T07:01:56.328Z', is.recurring: false },
    { description: 'TransAmerica Life Insurance', amount: 77, date: '2025-02-08T00:00:00.000Z', type: 'expense', category_id: 13, created.at: '2025-02-14T07:01:56.328Z', is.recurring: false },
    { description: 'test expense. monthly 1', amount: 1, date: '2025-02-19T00:00:00.000Z', type: 'expense', category_id: 14, created.at: '2025-02-19T22:03:18.612Z', is.recurring: false, day: 19 },
    { description: 'Majdi\'s Salary', amount: 4739, date: '2025-02-01T00:00:00.000Z', type: 'income', category.id: 17, created.at: '2025-02-14T07:01:56.328Z', recurring.type: 'twice.monthly', is.recurring: true },
    { description: 'Majdi\'s Salary', amount: 4739, date: '2025-02-15T00:00:00.000Z', type: 'income', category.id: 17, created.at: '2025-02-14T07:01:56.328Z', recurring.type: 'twice.monthly', is.recurring: true },
    { description: 'Ruba\'s Salary', amount: 2168, date: '2025-02-07T00:00:00.000Z', type: 'income', category.id: 17, created.at: '2025-02-14T07:01:56.328Z', recurring.type: 'biweekly', is.recurring: true },
    { description: 'Ruba\'s Salary', amount: 2168, date: '2025-02-21T00:00:00.000Z', type: 'income', category.id: 17, created.at: '2025-02-14T07:01:56.328Z', recurring.type: 'biweekly', is.recurring: true },
  ]);

  // Start the server
  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
}).catch(err => {
  console.error('Error synchronizing the database:', err);
});