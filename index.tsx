
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import './src/aws-config'; // Initialize AWS Amplify
import App from './App'; // AppSync version with full UI

const rootElement = document.getElementById('root');
if (!rootElement) {
    throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);
