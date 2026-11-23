import type { ReactElement, ReactNode } from 'react';
import { render } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { MemoryRouter, Routes } from 'react-router';
import { ColorModeProvider } from '@duncit/shell';
import type { IntelBootstrap } from '@duncit/gql-types';

interface Options {
  mocks?: MockedResponse[];
  initialEntries?: string[];
  routes?: ReactNode;
}

/** Renders inside the providers every Intel screen relies on: Apollo (mocked), theme and an in-memory router. */
export function renderWithProviders(ui: ReactElement, options: Options = {}) {
  const { mocks = [], initialEntries = ['/'], routes } = options;
  return render(
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={mocks}>
      <ColorModeProvider>
        <MemoryRouter initialEntries={initialEntries}>{routes ? <Routes>{routes}</Routes> : ui}</MemoryRouter>
      </ColorModeProvider>
    </MockedProvider>
  );
}

export const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

/** A bootstrap for an admin by default; pass overrides for other people. */
export function bootstrap(overrides: Partial<IntelBootstrap> = {}, me: Partial<IntelBootstrap['me']> = {}): IntelBootstrap {
  return {
    __typename: 'IntelBootstrap',
    app_title: 'Duncit Intel',
    description: 'Internal BI',
    default_environment: 'STAGING',
    default_model: 'gpt-4o',
    pending_approvals: 0,
    upload_max_mb: 100,
    upload_types: ['application/pdf', 'image/png', 'text/plain'],
    models: [
      { __typename: 'IntelModelOption', id: 'gpt-4o', label: 'GPT-4o', enabled: true, is_default: true },
      { __typename: 'IntelModelOption', id: 'gpt-4o-mini', label: 'GPT-4o mini', enabled: true, is_default: false },
    ],
    sources: [
      { __typename: 'IntelSourceCard', source: 'MONGODB', state: 'CONNECTED', connectors: 1, indexed: 12, last_sync_at: new Date().toISOString(), detail: 'documents' },
      { __typename: 'IntelSourceCard', source: 'MCP', state: 'ERROR', connectors: 1, indexed: 30, last_sync_at: null, detail: 'tools' },
      { __typename: 'IntelSourceCard', source: 'SLACK', state: 'DISCONNECTED', connectors: 0, indexed: 0, last_sync_at: null, detail: 'documents' },
    ],
    me: { __typename: 'IntelMe', user_id: 'admin-1', level: 'ADMIN', can_admin: true, can_super: false, environments: ['STAGING', 'PRODUCTION'], sources: ['MONGODB', 'MCP', 'GITHUB', 'SLACK', 'GMAIL', 'MEDIA'], can_request_writes: true, ...me },
    ...overrides,
  };
}
