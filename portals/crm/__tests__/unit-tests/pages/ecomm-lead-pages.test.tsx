import '../helpers/agGridEnv';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { GraphQLError } from 'graphql';
import EcommLeadEditorPage from '@/pages/ecomm-leads/EcommLeadEditorPage';
import EcommLeadsPage from '@/pages/ecomm-leads/EcommLeadsPage';
import {
  CREATE_ECOMM_LEAD,
  CRM_LEAD_CONFIG,
  DELETE_ECOMM_LEAD,
  ECOMM_LEAD,
  ECOMM_LEADS_TABLE,
  SUPER_CATEGORIES,
  UPDATE_ECOMM_LEAD,
} from '@/api/crm.gql';
import type { CrmOptionGroup } from '@/api/crm.types';
import { fromEcommLead, toEcommLeadInput } from '@/forms/ecomm-lead';
import { ecommLeadInitialValues } from '@/forms/ecomm-lead/ecomm-lead.types';
import { emptyContact } from '@/forms/fields/ContactsField';
import { renderWithApollo } from '../helpers/renderWithApollo';
import { ecommLead } from '../fixtures/leads';

const config: CrmOptionGroup = {
  venue_types: [], space_types: [], venue_event_suitability: [], week_days: [], booking_notices: [],
  pricing_models: [], amenities: [], lead_sources: ['Instagram'], venue_lead_statuses: [], host_lead_statuses: ['New'],
  priorities: ['High', 'Medium'], host_types: [], host_interests: [], audience_sizes: [], frequencies: [],
  revenue_models: [], host_intent_scores: [], services_offered_options: ['Catering'],
  venue_services_offered_options: [], host_services_offered_options: [],
};

const configMock = (value: object = config): MockedResponse => ({
  request: { query: CRM_LEAD_CONFIG },
  result: { data: { crmLeadConfig: value } },
  maxUsageCount: 5,
});

const superCategoriesMock: MockedResponse = {
  request: { query: SUPER_CATEGORIES },
  result: {
    data: {
      categories: [{ id: 'sc-events', name: 'Events', slug: 'events', icon: '', is_active: true, sort_order: 0 }],
    },
  },
  maxUsageCount: 5,
};

const lead = ecommLead();
const leadQueryMock = (value: unknown): MockedResponse => ({
  request: { query: ECOMM_LEAD, variables: { id: 'ecomm-1' } },
  result: { data: { ecommLead: value } },
});

const renderEditor = (route: string, path: string, mocks: MockedResponse[]) =>
  renderWithApollo(
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <EcommLeadEditorPage />
    </LocalizationProvider>,
    mocks,
    { route, path },
  );

beforeEach(() => {
  globalThis.localStorage.clear();
});

describe('EcommLeadEditorPage', () => {
  it('shows a spinner until the config and the lead have loaded', async () => {
    renderEditor('/ecomm-leads/ecomm-1', '/ecomm-leads/:id', [configMock(), superCategoriesMock, leadQueryMock({ ...lead, matched_user: null })]);

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(await screen.findByRole('heading', { level: 1, name: 'Edit Kavya Iyer' })).toBeInTheDocument();
  });

  it('reports an unknown lead instead of an empty form', async () => {
    renderEditor('/ecomm-leads/missing', '/ecomm-leads/:id', [
      configMock(),
      { request: { query: ECOMM_LEAD, variables: { id: 'missing' } }, result: { data: { ecommLead: null } } },
    ]);

    expect(await screen.findByText('Ecomm lead not found.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Update ecomm lead' })).toBeNull();
  });

  it('saves the edited lead through updateEcommLead and returns to the list', async () => {
    const update = vi.fn(() => ({ data: { updateEcommLead: lead } }));
    renderEditor('/ecomm-leads/ecomm-1', '/ecomm-leads/:id', [
      configMock(),
      superCategoriesMock,
      leadQueryMock({ ...lead, matched_user: null }),
      {
        request: {
          query: UPDATE_ECOMM_LEAD,
          variables: { id: 'ecomm-1', input: toEcommLeadInput(fromEcommLead(lead)) },
        },
        result: update,
      },
    ]);

    fireEvent.click(await screen.findByRole('button', { name: 'Update ecomm lead' }));

    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent(/^\/ecomm-leads$/));
    expect(update).toHaveBeenCalledTimes(1);
  });

  it('creates a new lead through createEcommLead and returns to the list', async () => {
    const create = vi.fn(() => ({ data: { createEcommLead: lead } }));
    const expectedInput = toEcommLeadInput({
      ...ecommLeadInitialValues,
      super_category_id: 'sc-events',
      seller_name: 'Ravi Textiles',
      contacts: [{ ...emptyContact, name: 'Ravi', mobile_number: '9876543210' }],
    });
    renderEditor('/ecomm-leads/new', '/ecomm-leads/new', [
      configMock(),
      superCategoriesMock,
      { request: { query: CREATE_ECOMM_LEAD, variables: { input: expectedInput } }, result: create },
    ]);

    expect(await screen.findByRole('heading', { level: 1, name: 'New Ecomm Lead' })).toBeInTheDocument();
    fireEvent.mouseDown(await screen.findByRole('combobox', { name: /super category/i }));
    fireEvent.click(within(screen.getByRole('listbox')).getByRole('option', { name: 'Events' }));
    fireEvent.change(screen.getByRole('textbox', { name: /Seller Name/ }), { target: { value: 'Ravi Textiles' } });
    fireEvent.click(screen.getByRole('button', { name: /2\. Contact Details/ }));
    fireEvent.change(await screen.findByRole('textbox', { name: /^Name/ }), { target: { value: 'Ravi' } });
    fireEvent.change(screen.getByRole('textbox', { name: /Mobile Number/ }), { target: { value: '9876543210' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create ecomm lead' }));

    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent(/^\/ecomm-leads$/));
    expect(create).toHaveBeenCalledTimes(1);
  });

  it('cancelling the form goes back to the list without saving', async () => {
    renderEditor('/ecomm-leads/new', '/ecomm-leads/new', [configMock(), superCategoriesMock]);

    fireEvent.click(await screen.findByRole('button', { name: 'Cancel' }));
    expect(screen.getByTestId('location')).toHaveTextContent(/^\/ecomm-leads$/);
  });
});

// tableQueryToGql() of DuncitTable's initial state (defaultSort next_follow_up_date asc).
const tableVars = {
  query: { search: null, page: 1, page_size: 25, sort_by: 'next_follow_up_date', sort_dir: 'asc', filters: [] },
};

const tableMock = (rows: unknown[], maxUsageCount = 1): MockedResponse => ({
  request: { query: ECOMM_LEADS_TABLE, variables: tableVars },
  result: { data: { ecommLeadsTable: { total: rows.length, rows } } },
  maxUsageCount,
});

const renderList = (mocks: MockedResponse[]) => renderWithApollo(<EcommLeadsPage />, mocks, { route: '/ecomm-leads' });

const openDelete = async () => {
  fireEvent.click(await screen.findByLabelText('Delete lead'));
  return within(await screen.findByRole('dialog'));
};

describe('EcommLeadsPage', () => {
  it('deletes a lead after confirmation, says so and reloads the table', async () => {
    const remove = vi.fn(() => ({ data: { deleteEcommLead: true } }));
    renderList([
      configMock(),
      superCategoriesMock,
      tableMock([lead]),
      { request: { query: DELETE_ECOMM_LEAD, variables: { id: 'ecomm-1' } }, result: remove },
      tableMock([]),
    ]);

    const dialog = await openDelete();
    expect(dialog.getByText('Delete "Kavya Iyer"? This cannot be undone.')).toBeInTheDocument();
    fireEvent.click(dialog.getByTestId('confirm-dialog-confirm'));

    expect(await screen.findByText('Ecomm lead deleted')).toBeInTheDocument();
    expect(remove).toHaveBeenCalledTimes(1);

    // The dialog is still fading out; a second press on it has no lead left to delete.
    fireEvent.click(screen.getByTestId('confirm-dialog-confirm'));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(remove).toHaveBeenCalledTimes(1);
    expect(await screen.findByText(/No ecomm leads yet/i)).toBeInTheDocument();

    fireEvent.keyDown(document.body, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByText('Ecomm lead deleted')).toBeNull());
  });

  it('shows why a delete failed, keeps the dialog open and lets the error be dismissed', async () => {
    renderList([
      configMock(),
      superCategoriesMock,
      tableMock([lead]),
      {
        request: { query: DELETE_ECOMM_LEAD, variables: { id: 'ecomm-1' } },
        result: { errors: [new GraphQLError('Lead has open orders')] },
      },
    ]);

    const dialog = await openDelete();
    fireEvent.click(dialog.getByTestId('confirm-dialog-confirm'));

    const alert = (await screen.findByText('Lead has open orders')).closest('[role="alert"]') as HTMLElement;
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.queryByText('Ecomm lead deleted')).toBeNull();

    fireEvent.click(dialog.getByTestId('confirm-dialog-cancel'));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    fireEvent.click(within(alert).getByRole('button', { name: 'Close' }));
    expect(screen.queryByText('Lead has open orders')).toBeNull();
    expect(screen.getByText('Kavya Iyer')).toBeInTheDocument();
  });

  it('still lists leads when the server config has no status or priority lists', async () => {
    renderList([
      configMock({ ...config, host_lead_statuses: null, priorities: null }),
      superCategoriesMock,
      tableMock([lead]),
    ]);

    expect(await screen.findByText('Kavya Iyer')).toBeInTheDocument();
    expect(screen.getByText('Kavya Handlooms')).toBeInTheDocument();
  });

  it('routes the toolbar and row actions to the matching screens', async () => {
    renderList([configMock(), superCategoriesMock, tableMock([lead])]);
    await screen.findByText('Kavya Iyer');

    fireEvent.click(screen.getByRole('button', { name: 'New Ecomm Lead' }));
    expect(screen.getByTestId('location')).toHaveTextContent('/ecomm-leads/new');

    // The tooltip around the button takes over its accessible name, so find it by its text.
    fireEvent.click(screen.getByText('Manage Ecomm Services').closest('button') as HTMLElement);
    expect(screen.getByTestId('location')).toHaveTextContent('/ecomm-leads/services');

    fireEvent.click(screen.getByLabelText('Edit lead'));
    expect(screen.getByTestId('location')).toHaveTextContent(/^\/ecomm-leads\/ecomm-1$/);

    fireEvent.click(screen.getByText('Kavya Iyer'));
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/ecomm-leads/ecomm-1/view'));
  });
});
