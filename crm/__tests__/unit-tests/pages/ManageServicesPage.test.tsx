import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
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
    <MockedProvider mocks={mocks} addTypename={false}>
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
        newData: createCalled,
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
        newData: updateCalled,
      },
      listMock(),
      configMock(),
    ]);
    await screen.findByText('Catering');
    const switches = screen.getAllByRole('checkbox');
    fireEvent.click(switches[0]);
    await waitFor(() => expect(updateCalled).toHaveBeenCalled());
  });

  it('opens the delete confirm dialog and deletes on confirm', async () => {
    const deleteCalled = vi.fn(() => ({ data: { deleteCrmService: true } }));
    wrap([
      listMock(),
      {
        request: { query: DELETE_CRM_SERVICE, variables: { id: 'svc-1' } },
        newData: deleteCalled,
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
