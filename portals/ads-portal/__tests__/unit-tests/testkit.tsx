import type { ReactElement, ReactNode } from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter, Routes } from 'react-router-dom';
import { ColorModeProvider } from '@duncit/shell';

interface Options {
  initialEntries?: string[];
  /** Pass <Route .../> children to mount the UI behind a path pattern. */
  routes?: ReactNode;
}

/**
 * Renders a component inside the two providers every ads-portal screen relies
 * on: the shared color-mode/theme provider and an in-memory router. Apollo
 * hooks are mocked per-test, so no ApolloProvider is wired here.
 */
export function renderWithProviders(ui: ReactElement, options: Options = {}) {
  const { initialEntries = ['/'], routes } = options;
  return render(
    <ColorModeProvider>
      <MemoryRouter initialEntries={initialEntries}>
        {routes ? <Routes>{routes}</Routes> : ui}
      </MemoryRouter>
    </ColorModeProvider>,
  );
}
