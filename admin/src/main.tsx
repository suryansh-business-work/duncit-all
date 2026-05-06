import React from 'react';
import ReactDOM from 'react-dom/client';
import { ApolloProvider } from '@apollo/client';
import { BrowserRouter } from 'react-router-dom';
import { apolloClient } from './apollo';
import { ColorModeProvider } from './ColorModeContext';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ApolloProvider client={apolloClient}>
      <ColorModeProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ColorModeProvider>
    </ApolloProvider>
  </React.StrictMode>
);
