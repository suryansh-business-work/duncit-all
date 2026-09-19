import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { renderWithProviders } from '../../../__tests__/testkit';
import MembershipPlansPage from '../MembershipPlansPage';
import { BENEFITS_TABLE, CREATE_PLAN, PLANS, PLANS_TABLE } from '../queries';

/** Grid stub with a fetch that round-trips through the suite's MockedProvider. */
vi.mock('@duncit/table', async (importOriginal) => {
  const stub = await import('../../location-subscriptions/__tests__/table-mock');
  return {
    ...(await importOriginal<typeof import('@duncit/table')>()),
    DuncitTable: stub.DuncitTable,
    useApolloTableFetch: stub.useApolloTableFetch,
  };
});

const emptyPage = (key: string, typename: string): MockedResponse => ({
  request: { query: key === 'plans' ? PLANS_TABLE : BENEFITS_TABLE, variables: () => true },
  maxUsageCount: Number.POSITIVE_INFINITY,
  result: {
    data: {
      [key === 'plans' ? 'membershipPlansTable' : 'membershipBenefitsTable']: { __typename: typename, total: 0, rows: [] },
    },
  },
});

describe('MembershipPlansPage', () => {
  it('opens on the tiers, and a new tier is waiting as a column on the comparison rows tab', async () => {
    let tierReads = 0;
    renderWithProviders(<MembershipPlansPage />, {
      mocks: [
        emptyPage('plans', 'MembershipPlansTablePage'),
        emptyPage('benefits', 'MembershipBenefitsTablePage'),
        {
          request: { query: CREATE_PLAN, variables: () => true },
          result: { data: { createMembershipPlan: { __typename: 'MembershipPlan', id: 'plan-connect' } } },
        },
        {
          request: { query: PLANS },
          maxUsageCount: 2,
          result: () => {
            tierReads += 1;
            return {
              data: {
                membershipPlans: [
                  { __typename: 'MembershipPlan', id: 'plan-connect', key: 'connect', name: 'Connect', sort_order: 0, is_active: true },
                ],
              },
            };
          },
        },
      ],
    });

    expect(screen.getByText('Coming soon')).toBeInTheDocument();
    fireEvent.click(await screen.findByRole('button', { name: 'New tier' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByRole('textbox', { name: /^Key/ }), { target: { value: 'connect' } });
    fireEvent.change(within(dialog).getByRole('textbox', { name: /^Display name/ }), { target: { value: 'Connect' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create tier' }));
    expect(await screen.findByText('Tier created')).toBeInTheDocument();

    fireEvent.click(await screen.findByRole('tab', { name: 'Comparison rows' }));
    fireEvent.click(await screen.findByRole('button', { name: 'New row' }));

    const rowDialog = await screen.findByRole('dialog', { name: 'New benefit row' });
    expect(await within(rowDialog).findByRole('textbox', { name: 'Connect' })).toBeInTheDocument();
    expect(tierReads).toBeGreaterThan(0);
  });
});
