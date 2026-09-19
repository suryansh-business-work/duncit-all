import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { renderWithProviders } from '../../__tests__/testkit';
import DashboardPage from '../DashboardPage';
import { SUPER_CATS, TOTALS } from '../dashboard/queries';

/**
 * The real grid is GridStack plus a saved-layout query, and it needs a layout
 * engine jsdom does not have — the same reason `@duncit/table` is stubbed in
 * this workspace. The stub keeps the WIDGET contract under test: the header,
 * and each widget's title, header actions and content.
 */
vi.mock('@duncit/dashboard', () => ({
  DuncitDashboard: ({
    header,
    widgets,
  }: Readonly<{
    header: ReactNode;
    widgets: readonly { id: string; title?: string; headerActions?: ReactNode; content: ReactNode }[];
  }>) => (
    <div>
      {header}
      {widgets.map((widget) => (
        <section key={widget.id} data-testid={`widget-${widget.id}`}>
          <h2>{widget.title}</h2>
          {widget.headerActions}
          {widget.content}
        </section>
      ))}
    </div>
  ),
}));

/** Chart.js needs a real canvas layout — see routes-smoke for the same stub. */
vi.mock('../dashboard/CountsBySuperCategoryGrid', () => ({
  default: ({ counts }: Readonly<{ counts: readonly unknown[] }>) => (
    <span data-testid="counts-chart">{`${counts.length} super categories`}</span>
  ),
}));

const count = (slug: string, name: string, value: number) => ({
  __typename: 'SuperCategoryCount',
  super_category_slug: slug,
  super_category_name: name,
  count: value,
});

const totals = (podsTotal: number, clubsTotal: number) => ({
  __typename: 'DashboardTotals',
  pods: [count('sports', 'Sports', podsTotal)],
  clubs: [count('sports', 'Sports', clubsTotal)],
  users_total: 1200,
  pods_total: podsTotal,
  clubs_total: clubsTotal,
  venues_total: 18,
  hosts_total: 42,
  support_tickets_open: 3,
  support_tickets_total: 9,
});

const mocks: MockedResponse[] = [
  {
    request: { query: SUPER_CATS },
    result: {
      data: {
        categories: [
          { __typename: 'Category', id: 'cat-sports', name: 'Sports', slug: 'sports' },
          { __typename: 'Category', id: 'cat-music', name: 'Music', slug: 'music' },
        ],
      },
    },
  },
  { request: { query: TOTALS, variables: { slug: null } }, result: { data: { dashboardTotals: totals(128, 12) } } },
  { request: { query: TOTALS, variables: { slug: 'sports' } }, result: { data: { dashboardTotals: totals(40, 5) } } },
];

describe('DashboardPage', () => {
  it('shows every super category’s totals, then narrows them to the one picked', async () => {
    renderWithProviders(<DashboardPage />, { mocks });

    const pods = screen.getByTestId('widget-pods-by-super-category');
    expect(await within(pods).findByText('Total 128')).toBeInTheDocument();
    expect(within(screen.getByTestId('widget-clubs-by-super-category')).getByText('Total 12')).toBeInTheDocument();

    fireEvent.mouseDown(screen.getByRole('combobox', { name: /Super Category/ }));
    fireEvent.click(await screen.findByRole('option', { name: 'Sports' }));

    expect(await within(pods).findByText('Total 40')).toBeInTheDocument();
    expect(within(screen.getByTestId('widget-clubs-by-super-category')).getByText('Total 5')).toBeInTheDocument();
    // The menu fades out before the rest of the page is exposed to the a11y tree again.
    await waitFor(() =>
      expect(screen.getByRole('combobox', { name: /Super Category/ })).toHaveTextContent('Sports'),
    );
  });

  it('shows zero totals before the counts arrive', () => {
    renderWithProviders(<DashboardPage />, { mocks: [] });
    expect(within(screen.getByTestId('widget-pods-by-super-category')).getByText('Total 0')).toBeInTheDocument();
    expect(within(screen.getByTestId('widget-pods-by-super-category')).getByTestId('counts-chart')).toHaveTextContent(
      '0 super categories',
    );
  });
});
