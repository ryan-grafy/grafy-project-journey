import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import ClientShareView from './components/ClientShareView.tsx';

const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error('Failed to find the root element');
} else {
  const root = ReactDOM.createRoot(rootElement);
  const isShareView = window.location.pathname.startsWith('/share/');

  root.render(
    <React.StrictMode>
      {isShareView ? <ClientShareView /> : <App />}
    </React.StrictMode>
  );
}