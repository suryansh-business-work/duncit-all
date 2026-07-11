import type { ReactElement, ReactNode } from 'react';
import { render } from '@testing-library/react';
import { MockedProvider, type MockedResponse } from '@apollo/client/testing';
import { gql } from '@apollo/client';
import { MemoryRouter, Routes } from 'react-router-dom';
import { ColorModeProvider } from '@duncit/shell';

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
  result: {
    data: {
      branding: {
        app_name: 'Duncit',
        logo_url: '/duncit-logo.svg',
        portals_logo_url: '',
        primary_color: '#10b981',
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
 * Renders a component inside the providers every Support screen relies on:
 * Apollo (mocked), the color-mode/theme provider, and an in-memory router.
 */
export function renderWithProviders(ui: ReactElement, options: Options = {}) {
  const { mocks = [], initialEntries = ['/'], routes } = options;
  // Always provide a branding mock — shell components fire it; unused mocks are
  // harmless for screens that don't.
  return render(
    <MockedProvider mocks={[brandingMock(), ...mocks]} addTypename={false}>
      <ColorModeProvider>
        <MemoryRouter initialEntries={initialEntries}>
          {routes ? <Routes>{routes}</Routes> : ui}
        </MemoryRouter>
      </ColorModeProvider>
    </MockedProvider>
  );
}

/** Resolves after Apollo's MockedProvider has flushed its microtask queue. */
export const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
