
// Client entry point with CommonJS syntax for compatibility
const React = require('react');
const ReactDOM = require('react-dom');
require('./index.css');

// Simple App component that displays a message and links to API
const App = () => {
  const [serverStatus, setServerStatus] = React.useState('Loading...');
  const [categories, setCategories] = React.useState([]);
  
  // Check server status on component mount
  React.useEffect(() => {
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
  
  return React.createElement('div', { style: { 
    fontFamily: 'Arial, sans-serif',
    maxWidth: '800px',
    margin: '0 auto',
    padding: '20px'
  }},
    React.createElement('h1', null, 'Budget Tracker App'),
    React.createElement('div', { style: { marginBottom: '20px' }},
      React.createElement('strong', null, 'Server Status: '),
      React.createElement('span', { 
        style: { 
          color: serverStatus === 'Running' ? 'green' : 'red',
          fontWeight: 'bold'
        } 
      }, serverStatus)
    ),
    React.createElement('h2', null, 'Categories'),
    categories.length > 0 
      ? React.createElement('ul', null, 
          categories.map(category => 
            React.createElement('li', { key: category.id },
              React.createElement('span', { 
                style: { 
                  display: 'inline-block',
                  width: '20px',
                  height: '20px',
                  backgroundColor: category.color || '#ccc',
                  marginRight: '10px',
                  borderRadius: '4px'
                } 
              }),
              `${category.name} (${category.icon || 'no icon'})`
            )
          )
        )
      : React.createElement('p', null, 'No categories found')
  );
};

// Render the App component
const rootElement = document.getElementById('root');
if (rootElement) {
  ReactDOM.render(
    React.createElement(React.StrictMode, null,
      React.createElement(App, null)
    ),
    rootElement
  );
}
