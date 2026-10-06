import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { GraphQLError } from 'graphql';
import { MockedProvider } from '@apollo/client/testing/react';
import ManageServicesPage from '@/pages/ManageServicesPage';
import {
  CREATE_CRM_SERVICE,
  CRM_LEAD_CONFIG,
  CRM_SERVICES,
  DELETE_CRM_SERVICE,
  UPDATE_CRM_SERVICE,
} from '@/api/crm.gql';

const listMock = (overrides: any[] = []) => ({
  request: { query: CRM_SERVICES, variables: { kind: 'VENUE', include_inactive: true } },
  result: {
    data: {
      crmServices: [
        { id: 'svc-1', name: 'Catering', kind: 'VENUE', sort_order: 1, is_active: true },
        { id: 'svc-2', name: 'Photography', kind: 'VENUE', sort_order: 2, is_active: false },
        ...overrides,
      ],
    },
  },
});

const configMock = () => ({
  request: { query: CRM_LEAD_CONFIG },
  result: {
    data: {
      crmLeadConfig: {
        venue_types: [], space_types: [], venue_event_suitability: [], week_days: [],
        booking_notices: [], pricing_models: [], amenities: [], lead_sources: [],
        venue_lead_statuses: [], host_lead_statuses: [], priorities: [], host_types: [],
        host_interests: [], audience_sizes: [], frequencies: [], revenue_models: [],
        host_intent_scores: [], services_offered_options: [],
        venue_services_offered_options: ['Catering'],
        host_services_offered_options: [],
      },
    },
  },
});

const wrap = (mocks: any[]) =>
  render(
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={mocks}>
      <ManageServicesPage kind="VENUE" />
    </MockedProvider>
  );

describe('ManageServicesPage', () => {
  it('renders the title and lists the catalogue rows', async () => {
    wrap([listMock()]);
    expect(await screen.findByText('Catering')).toBeTruthy();
    expect(screen.getByText('Photography')).toBeTruthy();
    expect(screen.getByText(/Manage Venue Services/i)).toBeTruthy();
  });

  it('shows the inline-add row when the Add button is clicked', async () => {
    wrap([listMock()]);
    await screen.findByText('Catering');
    fireEvent.click(screen.getByRole('button', { name: /Add service/i }));
    expect(screen.getByPlaceholderText(/Coaching/i)).toBeTruthy();
  });

  it('refuses to save when the name is empty', async () => {
    wrap([listMock()]);
    await screen.findByText('Catering');
    fireEvent.click(screen.getByRole('button', { name: /Add service/i }));
    fireEvent.click(screen.getAllByLabelText('Save').find((el) => el.tagName === 'BUTTON')!);
    expect(await screen.findByText(/Service name is required/i)).toBeTruthy();
  });

  it('creates a service via the Add flow', async () => {
    const createInput = { name: 'Decor', kind: 'VENUE', sort_order: 3, is_active: true };
    const createCalled = vi.fn(() => ({
      data: {
        createCrmService: { id: 'svc-3', name: 'Decor', kind: 'VENUE', sort_order: 3, is_active: true },
      },
    }));
    wrap([
      listMock(),
      {
        request: { query: CREATE_CRM_SERVICE, variables: { input: createInput } },
        result: createCalled,
      },
      listMock(),
      configMock(),
    ]);
    await screen.findByText('Catering');
    fireEvent.click(screen.getByRole('button', { name: /Add service/i }));
    fireEvent.change(screen.getByPlaceholderText(/Coaching/i), { target: { value: 'Decor' } });
    fireEvent.click(screen.getAllByLabelText('Save').find((el) => el.tagName === 'BUTTON')!);
    await waitFor(() => expect(createCalled).toHaveBeenCalled());
  });

  it('cancels the inline-add row without crashing', async () => {
    wrap([listMock()]);
    await screen.findByText('Catering');
    fireEvent.click(screen.getByRole('button', { name: /Add service/i }));
    fireEvent.change(screen.getByPlaceholderText(/Coaching/i), { target: { value: 'Decor' } });
    fireEvent.click(screen.getAllByLabelText('Cancel').find((el) => el.tagName === 'BUTTON')!);
    expect(screen.queryByPlaceholderText(/Coaching/i)).toBeNull();
  });

  it('toggles a row active state via the row switch', async () => {
    const updateCalled = vi.fn(() => ({
      data: {
        updateCrmService: { id: 'svc-1', name: 'Catering', kind: 'VENUE', sort_order: 1, is_active: false },
      },
    }));
    wrap([
      listMock(),
      {
        request: {
          query: UPDATE_CRM_SERVICE,
          variables: {
            id: 'svc-1',
            input: { name: 'Catering', kind: 'VENUE', sort_order: 1, is_active: false },
          },
        },
        result: updateCalled,
      },
      listMock(),
      configMock(),
    ]);
    await screen.findByText('Catering');
    // MUI's Switch reports role="switch", not "checkbox".
    const switches = screen.getAllByRole('switch');
    fireEvent.click(switches[0]);
    await waitFor(() => expect(updateCalled).toHaveBeenCalled());
  });

  it('opens the delete confirm dialog and deletes on confirm', async () => {
    const deleteCalled = vi.fn(() => ({ data: { deleteCrmService: true } }));
    wrap([
      listMock(),
      {
        request: { query: DELETE_CRM_SERVICE, variables: { id: 'svc-1' } },
        result: deleteCalled,
      },
      listMock(),
      configMock(),
    ]);
    await screen.findByText('Catering');
    const deleteIcons = screen.getAllByTestId('DeleteIcon');
    const deleteButton = deleteIcons[0].closest('button');
    expect(deleteButton).toBeTruthy();
    fireEvent.click(deleteButton!);
    expect(await screen.findByRole('heading', { name: /Delete service/i })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /^Delete$/i }));
    await waitFor(() => expect(deleteCalled).toHaveBeenCalled());
  });
});

const buttonLabelled = (label: string) =>
  screen.getAllByLabelText(label).find((el) => el.tagName === 'BUTTON') as HTMLButtonElement;

const updateMock = (input: Record<string, unknown>, result: () => unknown) => ({
  request: { query: UPDATE_CRM_SERVICE, variables: { id: 'svc-1', input } },
  result,
});

describe('ManageServicesPage — editing an existing row', () => {
  it('opens the inline editor with the row values and locks the other rows', async () => {
    wrap([listMock()]);
    await screen.findByText('Catering');
    fireEvent.click(screen.getAllByRole('button', { name: 'Edit' })[0]);

    expect(screen.getByRole('textbox', { name: 'Service name' })).toHaveValue('Catering');
    expect(screen.getByRole('textbox', { name: 'Order' })).toHaveValue('1');
    // The other row cannot be edited or deleted while a draft is open.
    expect(screen.getByRole('button', { name: 'Edit' })).toBeDisabled();
    screen.getAllByRole('button', { name: 'Delete' }).forEach((btn) => expect(btn).toBeDisabled());
    expect(screen.getByRole('button', { name: /Add service/i })).toBeDisabled();
  });

  it('saves the edited name, order and active flag through the update mutation', async () => {
    const updated = vi.fn(() => ({
      data: { updateCrmService: { id: 'svc-1', name: 'Buffet', kind: 'VENUE', sort_order: 5, is_active: false } },
    }));
    wrap([
      listMock(),
      updateMock({ name: 'Buffet', kind: 'VENUE', sort_order: 5, is_active: false }, updated),
      listMock(),
      configMock(),
    ]);
    await screen.findByText('Catering');
    fireEvent.click(screen.getAllByRole('button', { name: 'Edit' })[0]);
    fireEvent.change(screen.getByRole('textbox', { name: 'Service name' }), { target: { value: '  Buffet ' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'Order' }), { target: { value: '5' } });
    const activeSwitch = screen.getByRole('switch', { name: 'Active: Catering' });
    // While editing, the switch only changes the draft — no mutation fires yet.
    fireEvent.click(activeSwitch);
    expect(activeSwitch).not.toBeChecked();
    expect(updated).not.toHaveBeenCalled();

    fireEvent.click(buttonLabelled('Save'));
    await waitFor(() => expect(updated).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.queryByRole('textbox', { name: 'Service name' })).toBeNull());
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('falls back to order 0 when the order field is not a number', async () => {
    const updated = vi.fn(() => ({
      data: { updateCrmService: { id: 'svc-1', name: 'Catering', kind: 'VENUE', sort_order: 0, is_active: true } },
    }));
    wrap([
      listMock(),
      updateMock({ name: 'Catering', kind: 'VENUE', sort_order: 0, is_active: true }, updated),
      listMock(),
      configMock(),
    ]);
    await screen.findByText('Catering');
    fireEvent.click(screen.getAllByRole('button', { name: 'Edit' })[0]);
    fireEvent.change(screen.getByRole('textbox', { name: 'Order' }), { target: { value: 'first' } });
    fireEvent.click(buttonLabelled('Save'));
    await waitFor(() => expect(updated).toHaveBeenCalledTimes(1));
  });

  it('keeps the editor open and shows the server error when the save is rejected', async () => {
    wrap([
      listMock(),
      {
        request: {
          query: UPDATE_CRM_SERVICE,
          variables: { id: 'svc-1', input: { name: 'Photography', kind: 'VENUE', sort_order: 1, is_active: true } },
        },
        result: { errors: [new GraphQLError('A service with that name already exists')] },
      },
    ]);
    await screen.findByText('Catering');
    fireEvent.click(screen.getAllByRole('button', { name: 'Edit' })[0]);
    fireEvent.change(screen.getByRole('textbox', { name: 'Service name' }), { target: { value: 'Photography' } });
    fireEvent.click(buttonLabelled('Save'));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('A service with that name already exists');
    expect(screen.getByRole('textbox', { name: 'Service name' })).toHaveValue('Photography');

    fireEvent.click(within(alert).getByRole('button', { name: /close/i }));
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
  });

  it('discards the edit on cancel and restores the read-only row', async () => {
    wrap([listMock()]);
    await screen.findByText('Catering');
    fireEvent.click(screen.getAllByRole('button', { name: 'Edit' })[0]);
    fireEvent.change(screen.getByRole('textbox', { name: 'Service name' }), { target: { value: 'Changed' } });
    fireEvent.click(buttonLabelled('Cancel'));

    expect(screen.queryByRole('textbox', { name: 'Service name' })).toBeNull();
    expect(screen.getByText('Catering')).toBeInTheDocument();
    expect(screen.queryByText('Changed')).toBeNull();
  });
});

describe('ManageServicesPage — empty catalogue', () => {
  it('invites the first service and starts its draft at order 0', async () => {
    wrap([
      {
        request: { query: CRM_SERVICES, variables: { kind: 'VENUE', include_inactive: true } },
        result: { data: { crmServices: [] } },
      },
    ]);
    expect(await screen.findByText(/No services yet/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Add service/i }));

    expect(screen.queryByText(/No services yet/)).toBeNull();
    expect(screen.getByDisplayValue('0')).toBeInTheDocument();
  });
});

describe('ManageServicesPage — failures outside the editor', () => {
  it('reports a rejected active toggle', async () => {
    wrap([
      listMock(),
      {
        request: {
          query: UPDATE_CRM_SERVICE,
          variables: { id: 'svc-2', input: { name: 'Photography', kind: 'VENUE', sort_order: 2, is_active: true } },
        },
        result: { errors: [new GraphQLError('Not allowed to reactivate')] },
      },
    ]);
    await screen.findByText('Photography');
    fireEvent.click(screen.getByRole('switch', { name: 'Active: Photography' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Not allowed to reactivate');
  });

  it('closes the confirm dialog and reports a rejected delete', async () => {
    wrap([
      listMock(),
      {
        request: { query: DELETE_CRM_SERVICE, variables: { id: 'svc-1' } },
        result: { errors: [new GraphQLError('Service is used by 3 leads')] },
      },
    ]);
    await screen.findByText('Catering');
    fireEvent.click(screen.getAllByRole('button', { name: 'Delete' })[0]);
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: /^Delete$/i }));

    expect(await screen.findByText('Service is used by 3 leads')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(screen.getByText('Catering')).toBeInTheDocument();
  });

  it('ignores a second confirm clicked while the dialog is closing', async () => {
    const deleteCalled = vi.fn(() => ({ data: { deleteCrmService: true } }));
    wrap([
      listMock(),
      { request: { query: DELETE_CRM_SERVICE, variables: { id: 'svc-1' } }, result: deleteCalled },
      listMock(),
      configMock(),
    ]);
    await screen.findByText('Catering');
    fireEvent.click(screen.getAllByRole('button', { name: 'Delete' })[0]);
    const confirm = within(await screen.findByRole('dialog')).getByRole('button', { name: /^Delete$/i });
    fireEvent.click(confirm);
    await waitFor(() => expect(deleteCalled).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(confirm).not.toBeDisabled());
    fireEvent.click(confirm);

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(deleteCalled).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('closes the confirm dialog without deleting on cancel', async () => {
    wrap([listMock()]);
    await screen.findByText('Catering');
    fireEvent.click(screen.getAllByRole('button', { name: 'Delete' })[0]);
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('Delete "Catering"?');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
