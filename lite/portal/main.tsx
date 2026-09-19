import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/nunito/400.css';
import '@fontsource/nunito/600.css';
import '@fontsource/nunito/700.css';
import '@fontsource/nunito/800.css';
import { App } from './App';

const root = document.getElementById('root');
if (!root) throw new Error('Duncit Lite Console: #root is missing from portal.html');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
