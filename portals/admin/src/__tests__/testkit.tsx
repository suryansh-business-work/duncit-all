import type { ReactElement, ReactNode } from 'react';
import { render } from '@testing-library/react';
import { type MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { MemoryRouter, Routes } from 'react-router-dom';
import { ConfirmProvider, NotifyHost } from '@duncit/dialogs';
import { DuncitLocalizationProvider } from '@duncit/app-settings';

interface Options {
  mocks?: MockedResponse[];
  initialEntries?: string[];
  /** Pass `<Route …/>` children to mount the UI behind a path pattern. */
  routes?: ReactNode;
}

/**
 * Renders a component inside the providers every admin screen relies on:
 * Apollo (mocked), the shared confirm dialog + notification host from
 * `@duncit/dialogs`, an in-memory router, and the date/time localization the
 * MUI X pickers require.
 *
 * The localization provider is the SAME one `mountPortal` puts above every
 * portal at boot, not a test-only copy — a second adapter here would date
 * fields differently under test than in the browser. Without it any screen
 * holding a picker threw "MUI: Can not find the date and time pickers
 * localization context" before it rendered, which is the single largest cause
 * of failing admin suites.
 *
 * `MockedProvider` runs with its default `addTypename: true`, so every mocked
 * response must carry `__typename` on each object.
 */
export function renderWithProviders(ui: ReactElement, options: Options = {}) {
  const { mocks = [], initialEntries = ['/'], routes } = options;
  return render(
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={mocks}>
      <DuncitLocalizationProvider>
        <ConfirmProvider>
          <MemoryRouter initialEntries={initialEntries}>
            {routes ? <Routes>{routes}</Routes> : ui}
            <NotifyHost />
          </MemoryRouter>
        </ConfirmProvider>
      </DuncitLocalizationProvider>
    </MockedProvider>,
  );
}

/** Resolves after Apollo's MockedProvider has flushed its microtask queue. */
export const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
