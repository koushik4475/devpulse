import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './styles.css';
import { ensureSettings } from './lib/db';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('DevPulse root element was not found.');

void ensureSettings().catch((error: unknown) => {
  // The app can still render its empty-state UI when browser storage is unavailable.
  console.error('Could not initialize DevPulse preferences.', error);
}).finally(() => {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </React.StrictMode>,
  );
});
