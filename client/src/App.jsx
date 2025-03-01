
import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [serverStatus, setServerStatus] = useState('Loading...');
  const [categories, setCategories] = useState([]);
  
  // Check server status on component mount
  useEffect(() => {
    fetch('/api/health')
      .then(response => response.json())
      .then(data => setServerStatus(data.status === 'ok' ? 'Running' : 'Error'))
      .catch(error => {
        console.error('Error checking server status:', error);
        setServerStatus('Error connecting to server');
      });
      
    // Try to fetch categories
    fetch('/api/categories')
      .then(response => response.json())
      .then(data => {
        console.log('Categories:', data);
        setCategories(data);
      })
      .catch(error => {
        console.error('Error fetching categories:', error);
      });
  }, []);
  
  return (
    <div style={{ 
      fontFamily: 'Arial, sans-serif',
      maxWidth: '800px',
      margin: '0 auto',
      padding: '20px'
    }}>
      <h1>Budget Tracker App</h1>
      <div style={{ marginBottom: '20px' }}>
        <strong>Server Status: </strong>
        <span style={{ 
          color: serverStatus === 'Running' ? 'green' : 'red',
          fontWeight: 'bold'
        }}>
          {serverStatus}
        </span>
      </div>
      <h2>Categories</h2>
      {categories.length > 0 
        ? (
          <ul>
            {categories.map(category => (
              <li key={category.id}>
                <span style={{ 
                  display: 'inline-block',
                  width: '20px',
                  height: '20px',
                  backgroundColor: category.color || '#ccc',
                  marginRight: '10px',
                  borderRadius: '4px'
                }}></span>
                {`${category.name} (${category.icon || 'no icon'})`}
              </li>
            ))}
          </ul>
        )
        : <p>No categories found</p>
      }
    </div>
  );
}

export default App;
