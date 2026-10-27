import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, within } from '@testing-library/react';
import { Route, useLocation } from 'react-router';
import { renderWithProviders } from '../testkit';
import { ops, resetOps } from '../mocks/ops';
import { makeEnvCategoryDef, makeEnvEntry } from '../mocks';

vi.mock('@apollo/client/react', async (io) => (await import('../mocks/ops')).apolloOpsFactory(io));
vi.mock('../../src/pages/environment/EnvVariablesTab', () => ({
  default: ({ category }: { category: string }) => <div data-testid="variables-tab">{category}</div>,
}));
vi.mock('../../src/pages/environment/PortalMappingTab', () => ({
  default: () => <div data-testid="mapping-tab" />,
}));
vi.mock('../../src/pages/environment/attempt-settings', () => ({
  default: () => <div data-testid="settings-tab" />,
}));

import EnvWorkspace from '../../src/pages/environment/workspace';
import EnvTestHistoryDialog from '../../src/pages/environment/workspace/EnvTestHistoryDialog';
import EnvSectionHeader from '../../src/pages/environment/workspace/EnvSectionHeader';

const counts = (category: string, over: Record<string, number> = {}) => ({
  __typename: 'EnvCategoryCounts',
  category,
  total: 4,
  active: 4,
  tested: 4,
  passing: 4,
  failing: 0,
  untested: 0,
  ...over,
});

const overview = (categories: ReturnType<typeof counts>[], over: Record<string, unknown> = {}) => ({
  __typename: 'EnvOverview',
  total: 10,
  active: 8,
  tested: 5,
  passing: 4,
  failing: 1,
  untested: 5,
  services: 6,
  services_ready: 3,
  categories,
  ...over,
});

const historyRow = (over: Record<string, unknown> = {}) => ({
  __typename: 'EnvTestLogEntry',
  id: 'h1',
  entry_id: 'e1',
  entry_name: 'SMTP One',
  category: 'EMAIL',
  kind: 'CONNECTION',
  ok: true,
  message: 'Connected',
  tested_by: 'Asha',
  created_at: '2026-10-20T10:00:00.000Z',
  ...over,
});

const CATEGORIES = [
  makeEnvCategoryDef({ category: 'EMAIL', label: 'Email', groupKey: 'MESSAGING', groupLabel: 'Messaging & OTP' }),
  makeEnvCategoryDef({ category: 'TWILIO', label: 'Twilio', groupKey: 'MESSAGING', groupLabel: 'Messaging & OTP' }),
  makeEnvCategoryDef({
    category: 'RAZORPAY',
    label: 'Razorpay',
    groupKey: 'PAYMENTS',
    groupLabel: 'Payments',
    groupDescription: 'Money in',
    description: 'Card and UPI',
    docUrl: 'https://dashboard.razorpay.test',
    apiDocsUrl: 'https://docs.razorpay.test',
  }),
];

function Search() {
  return <span data-testid="search">{useLocation().search}</span>;
}

const mount = (entry = '/environment') =>
  renderWithProviders(<></>, {
    initialEntries: [entry],
    routes: (
      <Route
        path="/environment"
        element={
          <>
            <EnvWorkspace />
            <Search />
          </>
        }
      />
    ),
  });

const seed = (counted = [counts('EMAIL'), counts('TWILIO', { passing: 2, failing: 1 }), counts('RAZORPAY', { tested: 1, untested: 3, passing: 1 })]) => {
  ops.q = {
    EnvCategories: { data: { envCategories: CATEGORIES } },
    EnvOverview: { data: { envOverview: overview(counted) } },
    EnvTestHistory: { data: { envTestHistory: [] } },
  };
};

beforeEach(() => {
  resetOps();
  seed();
});

describe('Environment workspace / overview', () => {
  it('opens on the overview with the stat tiles and the categories that need a look', () => {
    mount();

    expect(screen.getByTestId('env-overview')).toBeInTheDocument();
    expect(screen.getByTestId('env-stat-total')).toHaveTextContent('10');
    expect(screen.getByTestId('env-stat-failing')).toHaveTextContent('1');
    expect(screen.getByTestId('env-stat-services')).toHaveTextContent('3');
    // Email is fully passing, so only the failing and the untested categories are listed.
    expect(within(screen.getByTestId('env-overview')).queryByRole('button', { name: /^Email/ })).not.toBeInTheDocument();
    expect(within(screen.getByTestId('env-overview')).getByRole('button', { name: /^Twilio/ })).toBeInTheDocument();
    expect(within(screen.getByTestId('env-overview')).getByRole('button', { name: /^Razorpay/ })).toBeInTheDocument();
  });

  it('opens a category from its chip and keeps it in the URL', () => {
    mount();

    fireEvent.click(within(screen.getByTestId('env-overview')).getByRole('button', { name: /^Twilio/ }));

    expect(screen.getByTestId('search')).toHaveTextContent('section=TWILIO');
    expect(screen.getByTestId('variables-tab')).toHaveTextContent('TWILIO');
  });

  it('says everything is healthy when nothing is failing or untested', () => {
    seed([counts('EMAIL')]);
    mount();
    expect(screen.getByText('Every key has passed its latest test.')).toBeInTheDocument();
  });

  it('shows zeros before the overview has loaded', () => {
    ops.q.EnvOverview = { loading: true };
    mount();
    expect(screen.queryByTestId('env-stat-total')).not.toBeInTheDocument();
    expect(screen.getByText('Every key has passed its latest test.')).toBeInTheDocument();
  });

  it('shows the overview error in place of the tiles', () => {
    ops.q.EnvOverview = { error: new Error('overview unavailable') };
    mount();
    expect(screen.getByText('overview unavailable')).toBeInTheDocument();
    expect(screen.queryByTestId('env-stat-total')).not.toBeInTheDocument();
  });

  it('lists the recent test runs, passed and failed, with who ran them', () => {
    ops.q.EnvTestHistory = {
      data: {
        envTestHistory: [
          historyRow(),
          historyRow({ id: 'h2', entry_name: 'Twilio Two', ok: false, message: 'Auth failed', tested_by: null }),
        ],
      },
    };
    mount();

    const list = within(screen.getByTestId('env-test-history'));
    expect(list.getByText('SMTP One')).toBeInTheDocument();
    expect(list.getByText('Connected')).toBeInTheDocument();
    expect(list.getByTitle('Passed')).toBeInTheDocument();
    expect(list.getByTitle('Failed')).toBeInTheDocument();
    expect(list.getByText(/· by Asha$/)).toBeInTheDocument();
    expect(list.getAllByText(/^\d/).filter((node) => node.textContent?.includes('by '))).toHaveLength(1);
  });

  it('names a category by its key when the catalogue has no entry for it', () => {
    seed([counts('LEGACY', { failing: 1 })]);
    mount();
    expect(
      within(screen.getByTestId('env-overview')).getByRole('button', { name: /^LEGACY · 1 failing/ }),
    ).toBeInTheDocument();
  });

  it('shows a category with no counts yet without a counts chip', () => {
    seed([]);
    mount('/environment?section=EMAIL');
    expect(screen.getByRole('heading', { name: 'Email' })).toBeInTheDocument();
    expect(screen.queryByText(/keys · .+ tested/, { selector: '.MuiChip-label' })).not.toBeInTheDocument();
  });

  it('folds the configuration group on its own', async () => {
    mount();
    fireEvent.click(screen.getByRole('button', { name: /^Configuration/ }));
    await vi.waitFor(() => expect(screen.queryByTestId('env-section-mapping')).not.toBeInTheDocument());
    expect(screen.getByTestId('env-section-EMAIL')).toBeInTheDocument();
  });

  it('says there are no test runs yet', () => {
    mount();
    expect(screen.getByText('No tests have been run yet.')).toBeInTheDocument();
  });

  it('shows a test-history error', () => {
    ops.q.EnvTestHistory = { error: new Error('history unavailable') };
    mount();
    expect(screen.getByText('history unavailable')).toBeInTheDocument();
  });

  it('waits for the first history read', () => {
    ops.q.EnvTestHistory = { loading: true };
    mount();
    expect(screen.queryByText('No tests have been run yet.')).not.toBeInTheDocument();
  });
});

describe('Environment workspace / sections', () => {
  it('shows a category with its group, counts and links to the provider', () => {
    mount('/environment?section=RAZORPAY');

    expect(screen.getByTestId('variables-tab')).toHaveTextContent('RAZORPAY');
    expect(screen.getByRole('heading', { name: 'Razorpay' })).toBeInTheDocument();
    expect(screen.getByText('Card and UPI')).toBeInTheDocument();
    expect(screen.getByText('Payments', { selector: '.MuiChip-label' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Open Razorpay/ })).toHaveAttribute('href', 'https://dashboard.razorpay.test');
    expect(screen.getByRole('link', { name: /API documentation/ })).toHaveAttribute('href', 'https://docs.razorpay.test');
  });

  it('shows the mapping and settings sections', () => {
    mount('/environment?section=mapping');
    expect(screen.getByTestId('mapping-tab')).toBeInTheDocument();
    expect(screen.queryByTestId('settings-tab')).not.toBeInTheDocument();
  });

  it('shows the settings section', () => {
    mount('/environment?section=settings');
    expect(screen.getByTestId('settings-tab')).toBeInTheDocument();
  });

  it('falls back to the overview for a section nobody knows', () => {
    mount('/environment?section=nonsense');
    expect(screen.getByTestId('env-overview')).toBeInTheDocument();
  });

  it('shows a progress bar for a linked category while the catalogue has not arrived', () => {
    ops.q.EnvCategories = { loading: true };
    mount('/environment?section=EMAIL');
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.queryByTestId('variables-tab')).not.toBeInTheDocument();
  });
});

describe('Environment workspace / sidebar', () => {
  it('groups the categories with their counts and marks failing and healthy ones', () => {
    mount();

    expect(screen.getByTestId('env-section-EMAIL')).toHaveTextContent('4 keys · 4 tested');
    expect(within(screen.getByTestId('env-section-EMAIL')).getByTitle('Passed')).toBeInTheDocument();
    expect(within(screen.getByTestId('env-section-TWILIO')).getByTitle(/failing/i)).toBeInTheDocument();
    // Untested and partially passing: neither tick nor cross.
    expect(within(screen.getByTestId('env-section-RAZORPAY')).queryByTitle('Passed')).not.toBeInTheDocument();
    expect(screen.getByTestId('env-section-overview')).toHaveAttribute('aria-current', 'page');
  });

  it('narrows to the sections matching the search and opens their groups', () => {
    mount();

    fireEvent.change(screen.getByTestId('env-sidebar-search'), { target: { value: 'card and upi' } });

    expect(screen.getByTestId('env-section-RAZORPAY')).toBeInTheDocument();
    expect(screen.queryByTestId('env-section-EMAIL')).not.toBeInTheDocument();
  });

  it('matches on a group name and shows every section in it', () => {
    mount();
    fireEvent.change(screen.getByTestId('env-sidebar-search'), { target: { value: 'money in' } });
    expect(screen.getByTestId('env-section-RAZORPAY')).toBeInTheDocument();
    expect(screen.queryByTestId('env-section-TWILIO')).not.toBeInTheDocument();
  });

  it('says nothing matches, and clears the search', () => {
    mount();
    fireEvent.change(screen.getByTestId('env-sidebar-search'), { target: { value: 'zzz' } });

    expect(screen.getByText(/zzz/, { selector: '[role="status"]' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
    expect(screen.getByTestId('env-section-EMAIL')).toBeInTheDocument();
  });

  it('folds and unfolds one group, and all of them', async () => {
    mount();
    const email = () => screen.queryByTestId('env-section-EMAIL');
    expect(email()).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Messaging & OTP/ }));
    await vi.waitFor(() => expect(email()).not.toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /Messaging & OTP/ }));
    expect(await screen.findByTestId('env-section-EMAIL')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Collapse all' }));
    await vi.waitFor(() => expect(email()).not.toBeInTheDocument());
    expect(screen.queryByTestId('env-section-mapping')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Expand all' }));
    expect(await screen.findByTestId('env-section-EMAIL')).toBeInTheDocument();
    expect(screen.getByTestId('env-section-mapping')).toBeInTheDocument();
  });

  it('selects a section from the sidebar', () => {
    mount();
    fireEvent.click(screen.getByTestId('env-section-EMAIL'));
    expect(screen.getByTestId('search')).toHaveTextContent('section=EMAIL');
    expect(screen.getByTestId('env-section-EMAIL')).toHaveAttribute('aria-current', 'page');
  });
});

describe('EnvSectionHeader', () => {
  it('shows only the title when there is nothing else to say', () => {
    renderWithProviders(<EnvSectionHeader title="Overview" subtitle={null} />);
    expect(screen.getByRole('heading', { name: 'Overview' })).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('flags a category with failing keys', () => {
    renderWithProviders(
      <EnvSectionHeader
        title="Email"
        subtitle="Mail"
        def={makeEnvCategoryDef({ docUrl: 'https://dash.test' })}
        counts={counts('EMAIL', { failing: 2 }) as never}
      />,
    );
    expect(screen.getByText('4 keys · 4 tested').closest('.MuiChip-root')).toHaveClass('MuiChip-colorError');
    expect(screen.getByRole('link', { name: /Open Email/ })).toHaveAttribute('href', 'https://dash.test');
    expect(screen.queryByRole('link', { name: /API documentation/ })).not.toBeInTheDocument();
  });

  it('offers only the API docs when there is no dashboard link', () => {
    renderWithProviders(
      <EnvSectionHeader title="Email" subtitle="Mail" def={makeEnvCategoryDef({ apiDocsUrl: 'https://api.test' })} />,
    );
    expect(screen.getByRole('link', { name: /API documentation/ })).toHaveAttribute('href', 'https://api.test');
    expect(screen.queryByRole('link', { name: /Open Email/ })).not.toBeInTheDocument();
  });
});

describe('EnvTestHistoryDialog', () => {
  it('is closed without an entry', () => {
    renderWithProviders(<EnvTestHistoryDialog entry={null} onClose={vi.fn()} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('lists the runs on one entry and closes', () => {
    ops.q = { EnvTestHistory: { data: { envTestHistory: [historyRow()] } } };
    const onClose = vi.fn();
    renderWithProviders(<EnvTestHistoryDialog entry={makeEnvEntry({ name: 'SMTP One' })} onClose={onClose} />);

    expect(screen.getByRole('dialog')).toHaveTextContent('SMTP One');
    expect(screen.getByText('Connected')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
