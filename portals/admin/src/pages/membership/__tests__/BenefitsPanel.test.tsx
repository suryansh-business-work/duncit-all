import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { renderWithProviders } from '../../../__tests__/testkit';
import BenefitsPanel from '../BenefitsPanel';
import { BENEFITS_TABLE, CREATE_BENEFIT, DELETE_BENEFIT, PLANS, UPDATE_BENEFIT } from '../queries';

/** Grid stub with a fetch that round-trips through the suite's MockedProvider. */
vi.mock('@duncit/table', async (importOriginal) => {
  const stub = await import('../../location-subscriptions/__tests__/table-mock');
  return {
    ...(await importOriginal<typeof import('@duncit/table')>()),
    DuncitTable: stub.DuncitTable,
    useApolloTableFetch: stub.useApolloTableFetch,
  };
});

const tier = (key: string, name: string, isActive = true) => ({
  __typename: 'MembershipPlan',
  id: `plan-${key}`,
  key,
  name,
  sort_order: 1,
  is_active: isActive,
});

const plansMock = (plans: unknown[]): MockedResponse => ({
  request: { query: PLANS },
  result: { data: { membershipPlans: plans } },
});

const ALL_TIERS = [tier('access', 'Access'), tier('connect', 'Connect'), tier('elite', 'Elite', false)];

const benefit = (over: Record<string, unknown>) => ({
  __typename: 'MembershipBenefit',
  id: 'ben-early',
  group: 'Getting a spot',
  label: 'Early booking window',
  sort_order: 1,
  is_active: true,
  updated_at: '2026-08-01T00:00:00.000Z',
  values: [
    { __typename: 'MembershipBenefitValue', plan_key: 'access', value: '12h' },
    { __typename: 'MembershipBenefitValue', plan_key: 'connect', value: '' },
  ],
  ...over,
});

const EARLY = benefit({});
const LOUNGE = benefit({ id: 'ben-lounge', label: 'Host lounge', is_active: false, values: [] });

const tableMock = (rows: unknown[]): MockedResponse => ({
  request: { query: BENEFITS_TABLE, variables: () => true },
  maxUsageCount: Number.POSITIVE_INFINITY,
  result: { data: { membershipBenefitsTable: { __typename: 'MembershipBenefitsTablePage', total: rows.length, rows } } },
});

const capture = (
  query: MockedResponse['request']['query'],
  data: Record<string, unknown>,
  sent: unknown[],
): MockedResponse => ({
  request: { query, variables: () => true },
  result: (variables: Record<string, unknown>) => {
    sent.push(variables);
    return { data };
  },
});

const rowOf = (label: string) =>
  screen.getAllByTestId('table-row').find((row) => within(row).queryAllByText(label).length > 0) as HTMLElement;

const rowsShown = async (count: number) => {
  await waitFor(() => expect(screen.getAllByTestId('table-row')).toHaveLength(count));
};

describe('BenefitsPanel — the comparison rows', () => {
  it('reads each row as one line per tier, dashing an empty cell', async () => {
    renderWithProviders(<BenefitsPanel plansVersion={0} />, { mocks: [plansMock(ALL_TIERS), tableMock([EARLY, LOUNGE])] });
    await rowsShown(2);

    // The rendered line is joined with double spaces; the default text matcher collapses them.
    expect(within(rowOf('Early booking window')).getByText('access: 12h · connect: —')).toBeInTheDocument();
    expect(within(rowOf('Early booking window')).getByTestId('value-is_active')).toHaveTextContent('Active');
    expect(within(rowOf('Host lounge')).getByTestId('value-is_active')).toHaveTextContent('Inactive');
  });
});

describe('BenefitsPanel — editing', () => {
  it('edits a row with one input per active tier and saves every cell', async () => {
    const sent: unknown[] = [];
    renderWithProviders(<BenefitsPanel plansVersion={0} />, {
      mocks: [
        plansMock(ALL_TIERS),
        tableMock([EARLY]),
        capture(UPDATE_BENEFIT, { updateMembershipBenefit: { __typename: 'MembershipBenefit', id: 'ben-early' } }, sent),
      ],
    });
    await rowsShown(1);

    fireEvent.click(within(rowOf('Early booking window')).getByRole('button', { name: 'Edit' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Edit benefit row')).toBeInTheDocument();
    await waitFor(() => expect(within(dialog).getByRole('textbox', { name: 'Access' })).toHaveValue('12h'));
    expect(within(dialog).queryByRole('textbox', { name: 'Elite' })).toBeNull();

    fireEvent.change(within(dialog).getByRole('textbox', { name: 'Connect' }), { target: { value: '24h' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByText('Row updated')).toBeInTheDocument();
    expect(sent[0]).toEqual({
      benefit_id: 'ben-early',
      input: {
        group: 'Getting a spot',
        label: 'Early booking window',
        values: [
          { plan_key: 'access', value: '12h' },
          { plan_key: 'connect', value: '24h' },
        ],
        sort_order: 1,
        is_active: true,
      },
    });
  });

  it('reports a save the server refused', async () => {
    renderWithProviders(<BenefitsPanel plansVersion={0} />, {
      mocks: [
        plansMock(ALL_TIERS),
        tableMock([EARLY]),
        { request: { query: UPDATE_BENEFIT, variables: () => true }, error: new Error('Row is locked') },
      ],
    });
    await rowsShown(1);

    fireEvent.click(within(rowOf('Early booking window')).getByRole('button', { name: 'Edit' }));
    const dialog = await screen.findByRole('dialog');
    await waitFor(() => expect(within(dialog).getByRole('textbox', { name: 'Access' })).toHaveValue('12h'));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByText('Row is locked')).toBeInTheDocument();
  });
});

describe('BenefitsPanel — creating', () => {
  it('creates a switched-off row with a cell for each active tier', async () => {
    const sent: unknown[] = [];
    renderWithProviders(<BenefitsPanel plansVersion={0} />, {
      mocks: [
        plansMock(ALL_TIERS),
        tableMock([]),
        capture(CREATE_BENEFIT, { createMembershipBenefit: { __typename: 'MembershipBenefit', id: 'ben-new' } }, sent),
      ],
    });

    fireEvent.click(await screen.findByRole('button', { name: 'New row' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('New benefit row')).toBeInTheDocument();
    await waitFor(() => expect(within(dialog).getByRole('textbox', { name: 'Access' })).toBeInTheDocument());

    fireEvent.change(within(dialog).getByRole('textbox', { name: /^Section/ }), { target: { value: 'Perks' } });
    fireEvent.change(within(dialog).getByRole('textbox', { name: /^Benefit/ }), { target: { value: 'Free +1' } });
    fireEvent.change(within(dialog).getByRole('textbox', { name: 'Access' }), { target: { value: '✓' } });
    fireEvent.click(within(dialog).getByRole('switch', { name: 'Active' }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create row' }));

    expect(await screen.findByText('Row created')).toBeInTheDocument();
    expect(sent[0]).toMatchObject({
      input: {
        group: 'Perks',
        label: 'Free +1',
        values: [
          { plan_key: 'access', value: '✓' },
          { plan_key: 'connect', value: '' },
        ],
        is_active: false,
      },
    });
  });

  it('asks for a tier first when there are none to fill', async () => {
    renderWithProviders(<BenefitsPanel plansVersion={0} />, { mocks: [plansMock([]), tableMock([])] });

    fireEvent.click(await screen.findByRole('button', { name: 'New row' }));
    const dialog = await screen.findByRole('dialog');

    expect(within(dialog).getByText('Create a tier first — a row needs columns to fill.')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Create row' })).toBeDisabled();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});

describe('BenefitsPanel — deleting', () => {
  it('deletes a row once confirmed', async () => {
    const sent: unknown[] = [];
    renderWithProviders(<BenefitsPanel plansVersion={0} />, {
      mocks: [plansMock(ALL_TIERS), tableMock([EARLY]), capture(DELETE_BENEFIT, { deleteMembershipBenefit: true }, sent)],
    });
    await rowsShown(1);

    fireEvent.click(within(rowOf('Early booking window')).getByRole('button', { name: 'Delete' }));
    const confirm = await screen.findByRole('dialog');
    expect(within(confirm).getByText('Delete "Early booking window" from the comparison table?')).toBeInTheDocument();
    fireEvent.click(within(confirm).getByRole('button', { name: 'Delete' }));

    expect(await screen.findByText('Row deleted')).toBeInTheDocument();
    expect(sent).toEqual([{ benefit_id: 'ben-early' }]);
  });

  it('keeps the row when cancelled, and reports a refused delete', async () => {
    renderWithProviders(<BenefitsPanel plansVersion={0} />, {
      mocks: [
        plansMock(ALL_TIERS),
        tableMock([EARLY]),
        { request: { query: DELETE_BENEFIT, variables: { benefit_id: 'ben-early' } }, error: new Error('Row is in use') },
      ],
    });
    await rowsShown(1);

    fireEvent.click(within(rowOf('Early booking window')).getByRole('button', { name: 'Delete' }));
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.queryByText('Row is in use')).toBeNull();

    fireEvent.click(within(rowOf('Early booking window')).getByRole('button', { name: 'Delete' }));
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Delete' }));
    expect(await screen.findByText('Row is in use')).toBeInTheDocument();
  });
});

describe('BenefitsPanel — opened after the Plans tab wrote', () => {
  it('re-reads the tiers, and a failed read still leaves the rows usable', async () => {
    let tierReads = 0;
    renderWithProviders(<BenefitsPanel plansVersion={1} />, {
      mocks: [
        {
          request: { query: PLANS },
          // The mount read and the version re-read may or may not be merged into one request.
          maxUsageCount: 2,
          result: () => {
            tierReads += 1;
            return { errors: [{ message: 'Tiers are unavailable' }] };
          },
        },
        tableMock([EARLY]),
      ],
    });

    await rowsShown(1);
    await waitFor(() => expect(tierReads).toBeGreaterThan(0));

    // With no tiers read, a new row has no columns to fill.
    fireEvent.click(screen.getByRole('button', { name: 'New row' }));
    expect(
      within(await screen.findByRole('dialog')).getByText('Create a tier first — a row needs columns to fill.'),
    ).toBeInTheDocument();
  });
});
