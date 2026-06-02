import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react-native';
import type { ReactElement, ReactNode } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

/** Renders a component tree with the providers the app relies on. */
export function renderWithProviders(ui: ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 47, left: 0, right: 0, bottom: 34 },
        }}
      >
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </SafeAreaProvider>
    );
  }

  return render(ui, { wrapper: Wrapper });
}
