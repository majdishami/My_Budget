
const React = require('react');
const ReactDOM = require('react-dom');
require('./index.css');
const App = require('./App').default;

const rootElement = document.getElementById('root');
if (rootElement) {
  ReactDOM.render(
    React.createElement(React.StrictMode, null,
      React.createElement(App, null)
    ),
    rootElement
  );
}
