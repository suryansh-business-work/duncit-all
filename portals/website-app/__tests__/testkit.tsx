import type { ReactElement, ReactNode } from 'react';
import { render } from '@testing-library/react';
import { MockedProvider, type MockedResponse } from '@apollo/client/testing';
import { MemoryRouter, Routes } from 'react-router-dom';
import { ColorModeProvider } from '@duncit/shell';
import { ConfirmProvider } from '@duncit/dialogs';
import { appSettingsMock, brandingMock } from './mocks';

interface Options {
  mocks?: MockedResponse[];
  initialEntries?: string[];
  /** Pass <Route .../> children to mount the UI behind a path pattern. */
  routes?: ReactNode;
}

/**
 * Renders a component inside the providers every Website-portal screen relies
 * on: Apollo (mocked), the color-mode/theme provider, the confirm-dialog
 * provider, and an in-memory router.
 *
 * `MockedProvider` runs with its default `addTypename: true`, so every mocked
 * response MUST carry `__typename` on each object — which the typed factories in
 * `./mocks/*` provide for free from the generated `@duncit/gql-types` shapes.
 * That keeps the mock cache behaving like production (no deprecated
 * `addTypename={false}` escape hatch, no Apollo "__typename" runtime error).
 */
export function renderWithProviders(ui: ReactElement, options: Options = {}) {
  const { mocks = [], initialEntries = ['/'], routes } = options;
  // Always provide branding + app-settings mocks — shell chrome and every
  // date-formatting table cell fire them; unused mocks are harmless otherwise.
  return render(
    <MockedProvider mocks={[brandingMock(), appSettingsMock(), ...mocks]}>
      <ColorModeProvider>
        <ConfirmProvider>
          <MemoryRouter initialEntries={initialEntries}>
            {routes ? <Routes>{routes}</Routes> : ui}
          </MemoryRouter>
        </ConfirmProvider>
      </ColorModeProvider>
    </MockedProvider>,
  );
}

/** Resolves after Apollo's MockedProvider has flushed its microtask queue. */
export const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

/** Pre-seed a table's persisted column-visibility so declared-hidden columns render. */
export const showHiddenColumns = (tableId: string, fields: string[]): void => {
  const overrides: Record<string, boolean> = {};
  for (const f of fields) overrides[f] = false;
  localStorage.setItem(`duncit-table-cols:${tableId}`, JSON.stringify(overrides));
};
