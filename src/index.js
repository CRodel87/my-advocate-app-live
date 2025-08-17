import React from 'react';
import ReactDOM from 'react-dom/client'; // Notice the /client for React 18+
import App from './App'; // This imports your App component

// This is the entry point where your React app gets "mounted" to the webpage
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);