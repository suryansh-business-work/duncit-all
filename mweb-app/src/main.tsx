import React from 'react';
import ReactDOM from 'react-dom/client';
import { ApolloProvider } from '@apollo/client';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { apolloClient } from './apollo';
import { theme } from './theme';
import App from './App';
import { initPwa } from './pwa';

initPwa();

// Global image fallback: replace any broken/404 <img> with a placeholder
document.addEventListener(
  'error',
  (e) => {
    const t = e.target as HTMLElement;
    if (t.tagName === 'IMG') {
      const img = t as HTMLImageElement;
      if (!img.dataset.fallback) {
        img.dataset.fallback = '1';
        img.src = '/img-placeholder.svg';
      }
    }
  },
  true // capture phase — fires before React synthetic events
);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ApolloProvider client={apolloClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </LocalizationProvider>
      </ThemeProvider>
    </ApolloProvider>
  </React.StrictMode>
);
