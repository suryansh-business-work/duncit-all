import type { ReactElement, ReactNode } from 'react';
import { render } from '@testing-library/react';
import { MockedProvider, type MockedResponse } from '@apollo/client/testing';
import { MemoryRouter, Routes } from 'react-router-dom';
import { ConfirmProvider, NotifyHost } from '@duncit/dialogs';

interface Options {
  mocks?: MockedResponse[];
  initialEntries?: string[];
  /** Pass `<Route …/>` children to mount the UI behind a path pattern. */
  routes?: ReactNode;
}

/**
 * Renders a component inside the providers every admin screen relies on:
 * Apollo (mocked), the shared confirm dialog + notification host from
 * `@duncit/dialogs`, and an in-memory router.
 *
 * `MockedProvider` runs with its default `addTypename: true`, so every mocked
 * response must carry `__typename` on each object.
 */
export function renderWithProviders(ui: ReactElement, options: Options = {}) {
  const { mocks = [], initialEntries = ['/'], routes } = options;
  return render(
    <MockedProvider mocks={mocks}>
      <ConfirmProvider>
        <MemoryRouter initialEntries={initialEntries}>
          {routes ? <Routes>{routes}</Routes> : ui}
          <NotifyHost />
        </MemoryRouter>
      </ConfirmProvider>
    </MockedProvider>,
  );
}

/** Resolves after Apollo's MockedProvider has flushed its microtask queue. */
export const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
