
// Using CommonJS syntax for compatibility
const React = require('react');
const ReactDOM = require('react-dom');
require('./index.css');

// Simple component to show the app is loading
const App = () => {
  return React.createElement('div', { style: { textAlign: 'center', marginTop: '50px' }},
    React.createElement('h1', null, 'Budget Tracker App'),
    React.createElement('p', null, 'Server is running. Please check console for any errors.')
  );
};

ReactDOM.render(
  React.createElement(React.StrictMode, null,
    React.createElement(App, null)
  ),
  document.getElementById('root')
);
