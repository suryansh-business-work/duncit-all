import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { GraphQLError } from 'graphql';
import { renderWithProviders } from '../../../../__tests__/testkit';
import { CREATE_POD_PLAN, DELETE_POD_PLAN, UPDATE_POD_PLAN } from '../queries';
import PodPlansPage from '../PodPlansPage';

const harness = vi.hoisted(() => ({ refetch: vi.fn() }));

vi.mock('@duncit/table', () => ({
  useApolloTableFetch: () => async () => ({ rows: [], total: 0 }),
}));

const PLAN = {
  id: 'plan-1',
  key: 'premium',
  name: 'Premium',
  description: 'Priority booking',
  image_url: '',
  features: ['Priority booking'],
  price_label: '₹199',
  sort_order: 2,
  is_coming_soon: false,
  is_active: true,
};

// The table has its own suite; here it is the toolbar plus the two row actions.
vi.mock('../PodPlansTable', () => ({
  default: (props: {
    refetchRef: { current: (() => void) | null };
    toolbarActions: React.ReactNode;
    onEdit: (row: typeof PLAN) => void;
    onDelete: (row: typeof PLAN) => void;
  }) => {
    props.refetchRef.current = harness.refetch;
    return (
      <div>
        {props.toolbarActions}
        <button type="button" onClick={() => props.onEdit(PLAN)}>
          row-edit
        </button>
        <button type="button" onClick={() => props.onDelete(PLAN)}>
          row-delete
        </button>
      </div>
    );
  },
}));

const planInput = (over: Record<string, unknown> = {}) => ({
  key: 'gold',
  name: 'Gold',
  description: '',
  image_url: '',
  features: [] as string[],
  price_label: '',
  sort_order: 0,
  is_coming_soon: false,
  is_active: true,
  ...over,
});

const renderPage = (mocks: MockedResponse[] = []) =>
  renderWithProviders(<PodPlansPage />, { mocks });

const fillNewPlan = () => {
  fireEvent.click(screen.getByRole('button', { name: 'New plan' }));
  fireEvent.change(screen.getByRole('textbox', { name: /^Key/ }), { target: { value: 'gold' } });
  fireEvent.change(screen.getByRole('textbox', { name: /Display name/ }), { target: { value: 'Gold' } });
};

beforeEach(() => {
  harness.refetch.mockReset();
});

describe('PodPlansPage / create', () => {
  it('creates a plan, confirms, closes the dialog and reloads the grid', async () => {
    renderPage([
      {
        request: { query: CREATE_POD_PLAN, variables: { input: planInput() } },
        result: { data: { createPodPlan: { __typename: 'PodPlan', id: 'plan-9' } } },
      },
    ]);
    fillNewPlan();
    fireEvent.click(screen.getByRole('button', { name: 'Create plan' }));

    expect(await screen.findByText('Plan created')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(harness.refetch).toHaveBeenCalledTimes(1);
  });

  it('keeps the dialog open and shows the server message when the create fails', async () => {
    renderPage([
      {
        request: { query: CREATE_POD_PLAN, variables: { input: planInput() } },
        result: { errors: [new GraphQLError('A plan with this key already exists')] },
      },
    ]);
    fillNewPlan();
    fireEvent.click(screen.getByRole('button', { name: 'Create plan' }));

    expect(await screen.findByText('A plan with this key already exists')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(harness.refetch).not.toHaveBeenCalled();
  });
});

describe('PodPlansPage / edit', () => {
  it('updates the plan by id without re-sending its locked key', async () => {
    const { id: _id, key: _key, ...input } = { ...PLAN, name: 'Premium Plus' };
    renderPage([
      {
        request: { query: UPDATE_POD_PLAN, variables: { plan_id: 'plan-1', input } },
        result: { data: { updatePodPlan: { __typename: 'PodPlan', id: 'plan-1' } } },
      },
    ]);
    fireEvent.click(screen.getByText('row-edit'));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByRole('textbox', { name: /Display name/ }), {
      target: { value: 'Premium Plus' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByText('Plan updated')).toBeInTheDocument();
    expect(harness.refetch).toHaveBeenCalledTimes(1);
  });

  it('reports a failed update and leaves the grid alone', async () => {
    renderPage([
      {
        request: { query: UPDATE_POD_PLAN, variables: () => true },
        result: { errors: [new GraphQLError('Plan is locked')] },
      },
    ]);
    fireEvent.click(screen.getByText('row-edit'));
    fireEvent.click(await screen.findByRole('button', { name: 'Save changes' }));

    expect(await screen.findByText('Plan is locked')).toBeInTheDocument();
    expect(harness.refetch).not.toHaveBeenCalled();
  });

  it('abandons an edit from Cancel and opens a blank form next time', async () => {
    renderPage();
    fireEvent.click(screen.getByText('row-edit'));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByRole('textbox', { name: /^Key/ })).toHaveValue('premium');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'New plan' }));
    expect(await screen.findByRole('textbox', { name: /^Key/ })).toHaveValue('');
  });
});

describe('PodPlansPage / delete', () => {
  it('asks for confirmation naming the plan and deletes it once confirmed', async () => {
    renderPage([
      {
        request: { query: DELETE_POD_PLAN, variables: { plan_id: 'plan-1' } },
        result: { data: { deletePodPlan: true } },
      },
    ]);
    fireEvent.click(screen.getByText('row-delete'));
    expect(await screen.findByText('Delete plan "Premium"?')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    expect(await screen.findByText('Plan deleted')).toBeInTheDocument();
    expect(harness.refetch).toHaveBeenCalledTimes(1);
  });

  it('deletes nothing when the confirmation is dismissed', async () => {
    renderPage();
    fireEvent.click(screen.getByText('row-delete'));
    fireEvent.click(await screen.findByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(screen.queryByText('Delete plan "Premium"?')).not.toBeInTheDocument());
    expect(screen.queryByText('Plan deleted')).not.toBeInTheDocument();
    expect(harness.refetch).not.toHaveBeenCalled();
  });

  it('shows the server message when the delete fails', async () => {
    renderPage([
      {
        request: { query: DELETE_POD_PLAN, variables: { plan_id: 'plan-1' } },
        result: { errors: [new GraphQLError('Plan is in use')] },
      },
    ]);
    fireEvent.click(screen.getByText('row-delete'));
    fireEvent.click(await screen.findByRole('button', { name: 'Delete' }));

    expect(await screen.findByText('Plan is in use')).toBeInTheDocument();
    expect(harness.refetch).not.toHaveBeenCalled();
  });
});
