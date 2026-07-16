import type { ReactElement, ReactNode } from 'react';
import { render } from '@testing-library/react';
import { MockedProvider, type MockedResponse } from '@apollo/client/testing';
import { gql } from '@apollo/client';
import { MemoryRouter, Routes } from 'react-router-dom';
import { ColorModeProvider } from '@duncit/shell';
import { ConfirmProvider } from '@duncit/dialogs';

export const APP_BRANDING = gql`
  query AppBranding {
    branding {
      app_name
      logo_url
      portals_logo_url
      primary_color
      support_email
    }
  }
`;

/** A reusable mock for the branding query every shell component fires. */
export const brandingMock = (overrides: Record<string, unknown> = {}): MockedResponse => ({
  request: { query: APP_BRANDING },
  maxUsageCount: Number.POSITIVE_INFINITY,
  result: {
    data: {
      branding: {
        app_name: 'Duncit',
        logo_url: '/duncit-logo.svg',
        portals_logo_url: '',
        primary_color: '#2563eb',
        support_email: 'help@duncit.com',
        ...overrides,
      },
    },
  },
});

interface Options {
  mocks?: MockedResponse[];
  initialEntries?: string[];
  /** Pass <Route .../> children to mount the UI behind a path pattern. */
  routes?: ReactNode;
}

/**
 * Renders a component inside the providers every Website-portal screen relies
 * on: Apollo (mocked), the color-mode/theme provider, and an in-memory router.
 */
export function renderWithProviders(ui: ReactElement, options: Options = {}) {
  const { mocks = [], initialEntries = ['/'], routes } = options;
  // Always provide a branding mock — shell components fire it; unused mocks are
  // harmless for screens that don't.
  return render(
    <MockedProvider mocks={[brandingMock(), ...mocks]} addTypename={false}>
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

/**
 * Mock for a server `<name>Table` query driven by `useApolloTableFetch`
 * (client.query with a TableQueryInput variable). Matches any variables and is
 * reusable across the table's refetches.
 */
export const tableMock = <Row,>(
  query: unknown,
  resultKey: string,
  rows: Row[],
  /**
   * Row GraphQL type name. Required when the table query selects rows through a
   * named fragment (`...Fields on <Type>`): Apollo needs `__typename` on each
   * row to match the fragment's type condition, else it drops the fragment
   * fields and rows come back blank.
   */
  rowTypename?: string,
): MockedResponse => {
  const data = rowTypename
    ? rows.map((row) => ({ __typename: rowTypename, ...row }))
    : rows;
  return {
    request: { query: query as MockedResponse['request']['query'] },
    variableMatcher: () => true,
    maxUsageCount: Number.POSITIVE_INFINITY,
    result: { data: { [resultKey]: { total: rows.length, rows: data } } },
  };
};

/** Pre-seed a table's persisted column-visibility so declared-hidden columns render. */
export const showHiddenColumns = (tableId: string, fields: string[]): void => {
  const overrides: Record<string, boolean> = {};
  for (const f of fields) overrides[f] = false;
  localStorage.setItem(`duncit-table-cols:${tableId}`, JSON.stringify(overrides));
};
