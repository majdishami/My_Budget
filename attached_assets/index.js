const pkg = require('pg');
const { Pool } = pkg;

// Example of how you might use the Pool
const pool = new Pool({
  user: 'your_user',
  host: 'your_host',
  database: 'your_database',
  password: 'your_password',
  port: 5432,
});

// Example query to test the connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Error executing query', err.stack);
  } else {
    console.log('Query result:', res.rows);
  }
});

// Your existing server setup code...
// Make sure to replace this with your actual code
const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.listen(3000, () => {
  console.log('Server is running on port 3000');
});

const React = require('react');
const ReactDOM = require('react-dom');
const { QueryClient, QueryClientProvider } = require('react-query');
const { BrowserRouter: Router } = require('react-router-dom');
const App = require('./App').default;
require('./index.css');

// Initialize React Query client
const queryClient = new QueryClient();

ReactDOM.render(
  React.createElement(
    React.StrictMode,
    null,
    React.createElement(
      QueryClientProvider,
      { client: queryClient },
      React.createElement(
        Router,
        null,
        React.createElement(App, null)
      )
    )
  ),
  document.getElementById('root')
);