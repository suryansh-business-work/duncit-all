import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { renderWithProviders } from '../../../__tests__/testkit';
import PlansPanel from '../PlansPanel';
import { CREATE_PLAN, DELETE_PLAN, PLANS_TABLE, UPDATE_PLAN } from '../queries';

/** Grid stub with a fetch that round-trips through the suite's MockedProvider. */
vi.mock('@duncit/table', async (importOriginal) => {
  const stub = await import('../../location-subscriptions/__tests__/table-mock');
  return {
    ...(await importOriginal<typeof import('@duncit/table')>()),
    DuncitTable: stub.DuncitTable,
    useApolloTableFetch: stub.useApolloTableFetch,
  };
});

const plan = (over: Record<string, unknown>) => ({
  __typename: 'MembershipPlan',
  id: 'plan-access',
  key: 'access',
  name: 'Access',
  tagline: 'For people trying pods out',
  price_label: '₹1,499',
  price_note: '/ year',
  badge_label: 'Most popular',
  accent_color: '#B4532A',
  cta_label: 'Join',
  sort_order: 1,
  is_active: true,
  updated_at: '2026-08-01T00:00:00.000Z',
  ...over,
});

const ACCESS = plan({});
const ELITE = plan({
  id: 'plan-elite',
  key: 'elite',
  name: 'Elite',
  tagline: 'Invite only',
  price_label: '',
  price_note: '',
  badge_label: '',
  accent_color: '',
  sort_order: 3,
  is_active: false,
});

const tableMock = (rows: unknown[]): MockedResponse => ({
  request: { query: PLANS_TABLE, variables: () => true },
  maxUsageCount: Number.POSITIVE_INFINITY,
  result: { data: { membershipPlansTable: { __typename: 'MembershipPlansTablePage', total: rows.length, rows } } },
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

const rowOf = (name: string) =>
  screen.getAllByTestId('table-row').find((row) => within(row).queryAllByText(name).length > 0) as HTMLElement;

const rowsShown = async (count: number) => {
  await waitFor(() => expect(screen.getAllByTestId('table-row')).toHaveLength(count));
};

const textbox = (dialog: HTMLElement, label: RegExp) => within(dialog).getByRole('textbox', { name: label });

describe('PlansPanel — the tier table', () => {
  it('shows price, badge and status, dashing a tier with no price', async () => {
    renderWithProviders(<PlansPanel onChanged={vi.fn()} />, { mocks: [tableMock([ACCESS, ELITE])] });
    await rowsShown(2);

    const access = rowOf('Access');
    expect(within(access).getByText('₹1,499')).toBeInTheDocument();
    expect(within(access).getByText('Most popular')).toBeInTheDocument();
    expect(within(access).getByTestId('value-is_active')).toHaveTextContent('Active');

    const elite = rowOf('Elite');
    expect(within(elite).getByText('—')).toBeInTheDocument();
    expect(within(elite).getByTestId('value-is_active')).toHaveTextContent('Inactive');
    expect(within(elite).queryByText('Most popular')).toBeNull();
  });
});

describe('PlansPanel — creating and editing', () => {
  it('creates a tier with its key and tells the Benefits tab', async () => {
    const sent: unknown[] = [];
    const onChanged = vi.fn();
    renderWithProviders(<PlansPanel onChanged={onChanged} />, {
      mocks: [tableMock([]), capture(CREATE_PLAN, { createMembershipPlan: { __typename: 'MembershipPlan', id: 'plan-connect' } }, sent)],
    });

    fireEvent.click(await screen.findByRole('button', { name: 'New tier' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('New tier')).toBeInTheDocument();
    expect(within(dialog).getByText('e.g. access, connect, elite')).toBeInTheDocument();

    fireEvent.change(textbox(dialog, /^Key/), { target: { value: 'connect' } });
    fireEvent.change(textbox(dialog, /^Display name/), { target: { value: 'Connect' } });
    fireEvent.click(within(dialog).getByRole('switch', { name: 'Active (shown in the apps)' }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create tier' }));

    expect(await screen.findByText('Tier created')).toBeInTheDocument();
    expect(sent[0]).toMatchObject({ input: { key: 'connect', name: 'Connect', is_active: false, sort_order: 0 } });
    expect(onChanged).toHaveBeenCalledTimes(1);
  });

  it('edits a tier with its key locked, and never sends the key', async () => {
    const sent: unknown[] = [];
    renderWithProviders(<PlansPanel onChanged={vi.fn()} />, {
      mocks: [tableMock([ACCESS]), capture(UPDATE_PLAN, { updateMembershipPlan: { __typename: 'MembershipPlan', id: 'plan-access' } }, sent)],
    });
    await rowsShown(1);

    fireEvent.click(within(rowOf('Access')).getByRole('button', { name: 'Edit' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Edit tier')).toBeInTheDocument();
    expect(textbox(dialog, /^Key/)).toBeDisabled();
    expect(within(dialog).getByText('Locked — every comparison cell references this key.')).toBeInTheDocument();

    fireEvent.change(textbox(dialog, /^Display name/), { target: { value: 'Access Plus' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByText('Tier updated')).toBeInTheDocument();
    expect(sent[0]).toMatchObject({ plan_id: 'plan-access', input: { name: 'Access Plus', price_label: '₹1,499' } });
    expect((sent[0] as { input: Record<string, unknown> }).input).not.toHaveProperty('key');
  });

  it('reports a save the server refused and keeps the dialog open', async () => {
    renderWithProviders(<PlansPanel onChanged={vi.fn()} />, {
      mocks: [tableMock([ACCESS]), { request: { query: UPDATE_PLAN, variables: () => true }, error: new Error('Tier name taken') }],
    });
    await rowsShown(1);

    fireEvent.click(within(rowOf('Access')).getByRole('button', { name: 'Edit' }));
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByText('Tier name taken')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('closes the dialog from Cancel', async () => {
    renderWithProviders(<PlansPanel onChanged={vi.fn()} />, { mocks: [tableMock([])] });
    fireEvent.click(await screen.findByRole('button', { name: 'New tier' }));
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});

describe('PlansPanel — deleting', () => {
  it('deletes a tier once confirmed and tells the Benefits tab', async () => {
    const sent: unknown[] = [];
    const onChanged = vi.fn();
    renderWithProviders(<PlansPanel onChanged={onChanged} />, {
      mocks: [tableMock([ACCESS]), capture(DELETE_PLAN, { deleteMembershipPlan: true }, sent)],
    });
    await rowsShown(1);

    fireEvent.click(within(rowOf('Access')).getByRole('button', { name: 'Delete' }));
    const confirm = await screen.findByRole('dialog');
    expect(within(confirm).getByText('Delete “Access”? Its column is removed from every comparison row.')).toBeInTheDocument();
    fireEvent.click(within(confirm).getByRole('button', { name: 'Delete' }));

    expect(await screen.findByText('Tier deleted')).toBeInTheDocument();
    expect(sent).toEqual([{ plan_id: 'plan-access' }]);
    expect(onChanged).toHaveBeenCalledTimes(1);
  });

  it('keeps the tier when the confirmation is cancelled, and reports a refused delete', async () => {
    renderWithProviders(<PlansPanel onChanged={vi.fn()} />, {
      mocks: [tableMock([ACCESS]), { request: { query: DELETE_PLAN, variables: { plan_id: 'plan-access' } }, error: new Error('Tier has members') }],
    });
    await rowsShown(1);

    fireEvent.click(within(rowOf('Access')).getByRole('button', { name: 'Delete' }));
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.queryByText('Tier has members')).toBeNull();

    fireEvent.click(within(rowOf('Access')).getByRole('button', { name: 'Delete' }));
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Delete' }));
    expect(await screen.findByText('Tier has members')).toBeInTheDocument();
  });
});
