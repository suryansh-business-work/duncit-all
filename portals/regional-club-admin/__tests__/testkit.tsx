import type { ReactElement, ReactNode } from 'react';
import { render } from '@testing-library/react';
import { type MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { MemoryRouter, Routes } from 'react-router';
import { ColorModeProvider } from '@duncit/shell';

interface Options {
  mocks?: MockedResponse[];
  initialEntries?: string[];
  /** Pass <Route .../> children to mount the UI behind a path pattern. */
  routes?: ReactNode;
}

interface ProvidersProps {
  mocks: MockedResponse[];
  initialEntries: string[];
  children: ReactNode;
}

/**
 * The providers every Regional Club Admin screen relies on: Apollo (mocked),
 * the colour-mode/theme provider and an in-memory router.
 *
 * Every mocked response carries `__typename` on each object, so the mock cache
 * behaves like production.
 */
function Providers({ mocks, initialEntries, children }: Readonly<ProvidersProps>) {
  return (
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={mocks}>
      <ColorModeProvider>
        <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>
      </ColorModeProvider>
    </MockedProvider>
  );
}

/**
 * Renders inside {@link Providers}, passed as RTL's `wrapper` so a `rerender`
 * keeps the same Apollo client and router instead of dropping them.
 */
export function renderWithProviders(ui: ReactElement, options: Options = {}) {
  const { mocks = [], initialEntries = ['/'], routes } = options;
  const wrapper = ({ children }: Readonly<{ children: ReactNode }>) => (
    <Providers mocks={mocks} initialEntries={initialEntries}>
      {children}
    </Providers>
  );
  return render(routes ? <Routes>{routes}</Routes> : ui, { wrapper });
}
