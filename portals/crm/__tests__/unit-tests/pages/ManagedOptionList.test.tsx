import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { GraphQLError } from 'graphql';
import ManagedOptionList from '@/pages/data/venues/ManagedOptionList';
import {
  CREATE_CRM_MANAGED_OPTION,
  CRM_MANAGED_OPTIONS,
  DELETE_CRM_MANAGED_OPTION,
  UPDATE_CRM_MANAGED_OPTION,
  type CrmManagedOption,
} from '@/api/data.gql';
import { CRM_LEAD_CONFIG } from '@/api/crm.gql';

const option = (overrides: Partial<CrmManagedOption>): CrmManagedOption => ({
  id: 'opt',
  name: 'Option',
  group: 'AMENITY',
  sort_order: 0,
  is_active: true,
  ...overrides,
});

const parking = option({ id: 'a1', name: 'Parking', sort_order: 1 });
const stage = option({ id: 'a2', name: 'Stage', sort_order: 4, is_active: false });

const listMock = (rows: CrmManagedOption[]): MockedResponse => ({
  request: { query: CRM_MANAGED_OPTIONS, variables: { group: 'AMENITY', include_inactive: true } },
  result: { data: { crmManagedOptions: rows } },
});

const configMock: MockedResponse = {
  request: { query: CRM_LEAD_CONFIG },
  result: {
    data: {
      crmLeadConfig: {
        venue_types: [], space_types: [], venue_event_suitability: [], week_days: [], booking_notices: [],
        pricing_models: [], amenities: [], lead_sources: [], venue_lead_statuses: [], host_lead_statuses: [],
        priorities: [], host_types: [], host_interests: [], audience_sizes: [], frequencies: [],
        revenue_models: [], host_intent_scores: [], services_offered_options: [],
        venue_services_offered_options: [], host_services_offered_options: [],
      },
    },
  },
};

const renderList = (mocks: MockedResponse[]) =>
  render(
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={mocks}>
      <ManagedOptionList
        group="AMENITY"
        addLabel="Add amenity"
        placeholder="e.g. Power backup"
        searchPlaceholder="Search amenities…"
      />
    </MockedProvider>,
  );

const saveButton = () => screen.getByTestId('crm-managed-option-save');

describe('ManagedOptionList', () => {
  it('creates a new option one past the highest order, then shows the refetched list', async () => {
    const created = vi.fn(() => ({
      data: { createCrmManagedOption: option({ id: 'a3', name: 'Power backup', sort_order: 5 }) },
    }));
    renderList([
      listMock([stage, parking]),
      {
        request: {
          query: CREATE_CRM_MANAGED_OPTION,
          variables: { input: { name: 'Power backup', group: 'AMENITY', sort_order: 5, is_active: true } },
        },
        result: created,
      },
      listMock([parking, stage, option({ id: 'a3', name: 'Power backup', sort_order: 5 })]),
      configMock,
    ]);
    await screen.findByText('Parking');

    fireEvent.click(screen.getByRole('button', { name: 'Add amenity' }));
    expect(screen.getByTestId('crm-managed-option-order-input').querySelector('input')).toHaveValue('5');
    expect(screen.getByRole('button', { name: 'Add amenity' })).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText('e.g. Power backup'), { target: { value: '  Power backup  ' } });
    fireEvent.click(saveButton());

    await waitFor(() => expect(created).toHaveBeenCalledTimes(1));
    expect(await screen.findByText('Power backup')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByTestId('crm-managed-option-save')).toBeNull());
  });

  it('refuses to save a blank name', async () => {
    renderList([listMock([parking])]);
    await screen.findByText('Parking');

    fireEvent.click(screen.getByRole('button', { name: 'Add amenity' }));
    fireEvent.click(saveButton());

    expect(await screen.findByText('Name is required.')).toBeInTheDocument();
    expect(screen.getByTestId('crm-managed-option-save')).toBeInTheDocument();
  });

  it('edits a row in place and saves a non-numeric order as 0', async () => {
    const updated = vi.fn(() => ({
      data: { updateCrmManagedOption: option({ id: 'a1', name: 'Valet parking', sort_order: 0, is_active: false }) },
    }));
    renderList([
      listMock([parking, stage]),
      {
        request: {
          query: UPDATE_CRM_MANAGED_OPTION,
          variables: { id: 'a1', input: { name: 'Valet parking', sort_order: 0, is_active: false } },
        },
        result: updated,
      },
      listMock([option({ id: 'a1', name: 'Valet parking', sort_order: 0, is_active: false }), stage]),
      configMock,
    ]);
    await screen.findByText('Parking');

    fireEvent.click(screen.getByRole('button', { name: 'Edit Parking' }));
    const nameInput = screen.getByPlaceholderText('e.g. Power backup');
    expect(nameInput).toHaveValue('Parking');
    // Other rows lock while one is being edited.
    expect(screen.getByRole('button', { name: 'Edit Stage' })).toBeDisabled();

    fireEvent.change(nameInput, { target: { value: 'Valet parking' } });
    fireEvent.change(screen.getByTestId('crm-managed-option-order-input').querySelector('input')!, {
      target: { value: 'abc' },
    });
    fireEvent.click(screen.getByTestId('crm-managed-option-active-input').querySelector('input')!);
    fireEvent.click(saveButton());

    await waitFor(() => expect(updated).toHaveBeenCalledTimes(1));
    expect(await screen.findByText('Valet parking')).toBeInTheDocument();
  });

  it('cancelling an in-place edit restores the read-only row', async () => {
    renderList([listMock([parking])]);
    await screen.findByText('Parking');

    fireEvent.click(screen.getByRole('button', { name: 'Edit Parking' }));
    fireEvent.change(screen.getByPlaceholderText('e.g. Power backup'), { target: { value: 'Changed' } });
    fireEvent.click(screen.getByTestId('crm-managed-option-cancel'));

    expect(screen.queryByPlaceholderText('e.g. Power backup')).toBeNull();
    expect(screen.getByText('Parking')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit Parking' })).toBeEnabled();
  });

  it('shows the server error and keeps the editor open when saving fails', async () => {
    renderList([
      listMock([parking]),
      {
        request: {
          query: CREATE_CRM_MANAGED_OPTION,
          variables: { input: { name: 'Parking', group: 'AMENITY', sort_order: 2, is_active: true } },
        },
        result: { errors: [new GraphQLError('An amenity with that name already exists')] },
      },
    ]);
    await screen.findByText('Parking');

    fireEvent.click(screen.getByRole('button', { name: 'Add amenity' }));
    fireEvent.change(screen.getByPlaceholderText('e.g. Power backup'), { target: { value: 'Parking' } });
    fireEvent.click(saveButton());

    expect(await screen.findByText('An amenity with that name already exists')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('e.g. Power backup')).toHaveValue('Parking');
  });

  it('deletes a row after confirmation and closes the dialog', async () => {
    const deleted = vi.fn(() => ({ data: { deleteCrmManagedOption: true } }));
    renderList([
      listMock([parking, stage]),
      { request: { query: DELETE_CRM_MANAGED_OPTION, variables: { id: 'a2' } }, result: deleted },
      listMock([parking]),
      configMock,
    ]);
    await screen.findByText('Stage');

    fireEvent.click(screen.getByRole('button', { name: 'Delete Stage' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Delete "Stage"')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(deleted).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    await waitFor(() => expect(screen.queryByText('Stage')).toBeNull());
    expect(screen.getByText('Parking')).toBeInTheDocument();
  });

  it('reports a failed delete and still closes the dialog', async () => {
    renderList([
      listMock([parking]),
      {
        request: { query: DELETE_CRM_MANAGED_OPTION, variables: { id: 'a1' } },
        result: { errors: [new GraphQLError('Option is in use')] },
      },
    ]);
    await screen.findByText('Parking');

    fireEvent.click(screen.getByRole('button', { name: 'Delete Parking' }));
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Delete' }));

    expect(await screen.findByText('Option is in use')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(screen.getByText('Parking')).toBeInTheDocument();
  });

  it('filters rows by search and says so when nothing matches', async () => {
    renderList([listMock([parking, stage])]);
    await screen.findByText('Parking');

    const search = screen.getByRole('textbox', { name: 'Search amenities…' });
    fireEvent.change(search, { target: { value: 'sta' } });
    expect(screen.queryByText('Parking')).toBeNull();
    expect(screen.getByText('Stage')).toBeInTheDocument();

    fireEvent.change(search, { target: { value: 'zzz' } });
    expect(screen.getByText('No matches for your search.')).toBeInTheDocument();
  });

  it('orders rows by sort order, then by name when the orders tie', async () => {
    renderList([
      listMock([
        option({ id: 'b', name: 'Wifi', sort_order: 2 }),
        option({ id: 'c', name: 'AC', sort_order: 2 }),
        option({ id: 'd', name: 'Lift', sort_order: 1 }),
      ]),
    ]);
    await screen.findByText('Wifi');

    const names = screen.getAllByRole('row').slice(1).map((row) => within(row).getAllByRole('cell')[1].textContent);
    expect(names).toEqual(['Lift', 'AC', 'Wifi']);
  });

  it('flips a row active flag straight from its switch', async () => {
    const toggled = vi.fn(() => ({ data: { updateCrmManagedOption: { ...stage, is_active: true } } }));
    renderList([
      listMock([stage]),
      {
        request: { query: UPDATE_CRM_MANAGED_OPTION, variables: { id: 'a2', input: { is_active: true } } },
        result: toggled,
      },
      listMock([{ ...stage, is_active: true }]),
      configMock,
    ]);
    await screen.findByText('Stage');
    expect(screen.getByText('Inactive')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('switch', { name: 'Active: Stage' }));

    await waitFor(() => expect(toggled).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.queryByText('Inactive')).toBeNull());
  });

  it('cancelling the delete dialog leaves the row untouched', async () => {
    renderList([listMock([parking])]);
    await screen.findByText('Parking');

    fireEvent.click(screen.getByRole('button', { name: 'Delete Parking' }));
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(screen.getByText('Parking')).toBeInTheDocument();
  });

  it('shows the load error and lets the form error be dismissed', async () => {
    renderList([
      {
        request: { query: CRM_MANAGED_OPTIONS, variables: { group: 'AMENITY', include_inactive: true } },
        result: { errors: [new GraphQLError('Could not load amenities')] },
      },
    ]);
    expect(await screen.findByText('Could not load amenities')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Add amenity' }));
    fireEvent.click(saveButton());
    expect(await screen.findByText('Name is required.')).toBeInTheDocument();

    const alert = screen.getByText('Name is required.').closest('[role="alert"]') as HTMLElement;
    fireEvent.click(within(alert).getByRole('button', { name: 'Close' }));
    expect(screen.queryByText('Name is required.')).toBeNull();
  });

  it('starts the first option at order 0 on an empty list', async () => {
    renderList([listMock([])]);
    expect(await screen.findByText('Nothing here yet. Click "Add amenity".')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Add amenity' }));
    expect(screen.getByTestId('crm-managed-option-order-input').querySelector('input')).toHaveValue('0');

    fireEvent.click(screen.getByTestId('crm-managed-option-cancel'));
    expect(await screen.findByText('Nothing here yet. Click "Add amenity".')).toBeInTheDocument();
  });
});
