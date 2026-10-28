import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LITE_ENV_CATEGORIES, LITE_ENV_ENTRIES } from '../../../graphql/environment';
import { EnvironmentPage } from '../../../pages/environment';
import { emailCategory, msg91Category } from '../../fixtures';
import { gqlEnvCategory } from '../../gql-results';
import { renderWithProviders, type GqlMock } from '../../test-utils';

vi.mock('@duncit/table', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@duncit/table')>();
  const { FakeDuncitTable } = await import('../../fake-table');
  return { ...actual, DuncitTable: FakeDuncitTable };
});

vi.mock('../../../../shared/session', async () => {
  const fixtures = await import('../../fixtures');
  return { useLiteSession: () => fixtures.makeSession() };
});

const categories: GqlMock = { request: { query: LITE_ENV_CATEGORIES }, result: { data: { liteEnvCategories: [emailCategory(), msg91Category()].map(gqlEnvCategory) } } };
const noEntries: GqlMock = {
  request: { query: LITE_ENV_ENTRIES, variables: () => true },
  result: { data: { liteEnvEntries: [] } },
  maxUsageCount: Number.POSITIVE_INFINITY,
};

describe('EnvironmentPage', () => {
  it('shows one tab per server-defined category and opens the first', async () => {
    renderWithProviders(<EnvironmentPage />, { mocks: [categories, noEntries] });
    expect(screen.getByRole('heading', { level: 1, name: 'Environment' })).toBeInTheDocument();
    const tabs = await screen.findAllByRole('tab');
    expect(tabs.map((tab) => tab.textContent)).toEqual(['Email (SMTP)', 'MSG91 (SMS sign-in)']);
    expect(screen.getByRole('tablist', { name: 'Environment categories' })).toBeInTheDocument();
    expect(screen.getByTestId('env-tab-email')).toHaveAttribute('aria-selected', 'true');
    expect(await screen.findByTestId('env-add')).toHaveTextContent('Add Email (SMTP)');
    expect(screen.getByRole('tabpanel', { name: 'Email (SMTP)' })).toBeInTheDocument();
  });

  it('switches the panel when another category tab is picked', async () => {
    const user = userEvent.setup();
    renderWithProviders(<EnvironmentPage />, { mocks: [categories, noEntries] });
    await user.click(await screen.findByTestId('env-tab-msg91'));
    expect(screen.getByTestId('env-tab-msg91')).toHaveAttribute('aria-selected', 'true');
    expect(await screen.findByTestId('env-add')).toHaveTextContent('Add MSG91 (SMS sign-in)');
  });

  it('opens straight on the tab named in the URL', async () => {
    renderWithProviders(<EnvironmentPage />, { mocks: [categories, noEntries], route: '/environment?selectedtab=MSG91' });
    expect(await screen.findByTestId('env-add')).toHaveTextContent('Add MSG91 (SMS sign-in)');
  });

  it('shows the error when the categories cannot load', async () => {
    renderWithProviders(<EnvironmentPage />, { mocks: [{ request: { query: LITE_ENV_CATEGORIES }, error: new Error('Categories unavailable') }] });
    expect(await screen.findByTestId('query-guard-error')).toHaveTextContent('Categories unavailable');
    expect(screen.queryByRole('tab')).not.toBeInTheDocument();
  });

  it('shows no panel when the server defines no categories', async () => {
    renderWithProviders(<EnvironmentPage />, { mocks: [{ request: { query: LITE_ENV_CATEGORIES }, result: { data: { liteEnvCategories: [] } } }] });
    expect(await screen.findByRole('tablist')).toBeInTheDocument();
    expect(screen.queryByRole('tabpanel')).not.toBeInTheDocument();
  });
});
