import '../helpers/agGridEnv';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { gql } from '@apollo/client';
import type { MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { MemoryRouter } from 'react-router';
import HostLeadsPage from '@/pages/host-leads/HostLeadsPage';
import { CREATE_HOST_LEAD, CRM_LEAD_CONFIG, DELETE_HOST_LEAD, HOST_LEADS_TABLE } from '@/api/crm.gql';
import { CRM_EXCEL_EXPORT, CRM_EXCEL_TEMPLATE } from '@/api/excel.gql';
import { hostLead } from '../fixtures/leads';
import { renderWithApollo } from '../helpers/renderWithApollo';

const utilsMocks = vi.hoisted(() => ({ downloadBase64File: vi.fn() }));

vi.mock('@duncit/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@duncit/utils')>();
  return { ...actual, downloadBase64File: utilsMocks.downloadBase64File };
});

// The dialogs keep these documents private; the mock link matches by printed query.
const AI_PARSE_CRM_LEADS = gql`
  mutation AiParseCrmLeads($entity: CrmAiEntity!, $text: String!) {
    aiParseCrmLeads(entity: $entity, text: $text)
  }
`;
const CRM_EXCEL_INSPECT = gql`
  query CrmExcelInspect($content_base64: String!) {
    crmExcelInspect(content_base64: $content_base64) { headers sample_rows }
  }
`;
const CRM_EXCEL_IMPORT = gql`
  mutation CrmExcelImport($entity: CrmAiEntity!, $content_base64: String!, $mapping: [CrmImportMappingInput!]) {
    crmExcelImport(entity: $entity, content_base64: $content_base64, mapping: $mapping) {
      inserted failed errors { row message }
    }
  }
`;

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

const tableVars = {
  query: { search: null, page: 1, page_size: 25, sort_by: 'next_follow_up_date', sort_dir: 'asc', filters: [] },
};

const tableMock = (rows: unknown[]): MockedResponse => ({
  request: { query: HOST_LEADS_TABLE, variables: tableVars },
  result: { data: { hostLeadsTable: { total: rows.length, rows } } },
});

const configMock = (lists: { host_lead_statuses: string[] | null; priorities: string[] | null }): MockedResponse => ({
  request: { query: CRM_LEAD_CONFIG },
  result: {
    data: {
      crmLeadConfig: {
        venue_types: [], space_types: [], venue_event_suitability: [], week_days: [], booking_notices: [],
        pricing_models: [], amenities: [], lead_sources: [], venue_lead_statuses: [],
        host_types: [], host_interests: [], audience_sizes: [], frequencies: [], revenue_models: [],
        host_intent_scores: [], services_offered_options: [], venue_services_offered_options: [],
        host_services_offered_options: [],
        ...lists,
      },
    },
  },
});

const excelMock = (query: typeof CRM_EXCEL_EXPORT, field: string, payload: unknown): MockedResponse => ({
  request: { query, variables: { entity: 'HOST_LEAD' } },
  result: { data: { [field]: payload } },
});

const renderPage = (mocks: MockedResponse[]) =>
  render(
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={mocks}>
      <MemoryRouter>
        <HostLeadsPage />
      </MemoryRouter>
    </MockedProvider>,
  );

/** Opens a column's header filter and lists the choices its enum select offers. */
const filterChoices = async (field: string, label: string) => {
  fireEvent.click(await screen.findByTestId(`table-filter-${field}`));
  const popover = within(await screen.findByRole('dialog', { name: `Filter ${label}` }));
  fireEvent.mouseDown(popover.getByRole('combobox', { name: label }));
  const listbox = await screen.findByRole('listbox');
  return within(listbox).queryAllByRole('option').map((o) => o.textContent);
};

beforeEach(() => {
  window.localStorage.clear();
  utilsMocks.downloadBase64File.mockClear();
});

describe('HostLeadsPage filters', () => {
  it('offers the host lead statuses configured on the server', async () => {
    renderPage([tableMock([hostLead()]), configMock({ host_lead_statuses: ['New', 'Qualified'], priorities: ['High', 'Low'] })]);
    await screen.findByText('Pune Runners');

    expect(await filterChoices('lead_status', 'Status')).toEqual(['New', 'Qualified']);
  });

  it('offers the priorities configured on the server', async () => {
    renderPage([tableMock([hostLead()]), configMock({ host_lead_statuses: ['New'], priorities: ['High', 'Low'] })]);
    await screen.findByText('Pune Runners');

    expect(await filterChoices('priority', 'Priority')).toEqual(['High', 'Low']);
  });

  it('offers no status or priority choices when the server sends no lists', async () => {
    renderPage([tableMock([hostLead()]), configMock({ host_lead_statuses: null, priorities: null })]);
    await screen.findByText('Pune Runners');

    expect(await filterChoices('lead_status', 'Status')).toEqual([]);
    fireEvent.keyDown(screen.getByRole('listbox'), { key: 'Escape' });
    fireEvent.keyDown(screen.getByRole('dialog', { name: 'Filter Status' }), { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(await filterChoices('priority', 'Priority')).toEqual([]);
  });
});

describe('HostLeadsPage delete', () => {
  it('deletes the confirmed lead, announces it and reloads the table', async () => {
    renderPage([
      tableMock([hostLead()]),
      { request: { query: DELETE_HOST_LEAD, variables: { id: 'host-1' } }, result: { data: { deleteHostLead: true } } },
      tableMock([]),
    ]);
    await screen.findByText('Pune Runners');

    fireEvent.click(screen.getByLabelText('Delete lead'));
    const dialog = within(await screen.findByRole('dialog'));
    expect(dialog.getByText('Delete "Pune Runners"? This cannot be undone.')).toBeInTheDocument();
    fireEvent.click(dialog.getByRole('button', { name: 'Delete' }));

    expect(await screen.findByText('Host lead deleted')).toBeInTheDocument();
    expect(await screen.findByText(/No host leads yet/i)).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText('Delete "Pune Runners"? This cannot be undone.')).toBeNull());
  });

  it('shows a dismissible error and keeps the dialog open when the delete fails', async () => {
    renderPage([
      tableMock([hostLead()]),
      { request: { query: DELETE_HOST_LEAD, variables: { id: 'host-1' } }, error: new Error('Lead has open calls') },
    ]);
    await screen.findByText('Pune Runners');

    fireEvent.click(screen.getByLabelText('Delete lead'));
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Delete' }));

    const alert = await screen.findByText('Lead has open calls');
    expect(screen.getByText('Delete "Pune Runners"? This cannot be undone.')).toBeInTheDocument();

    // The alert sits on the page behind the modal; back out of the dialog to reach it.
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    fireEvent.click(within(alert.closest('.MuiAlert-root') as HTMLElement).getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByText('Lead has open calls')).toBeNull());
  });
});

describe('HostLeadsPage Excel', () => {
  it('downloads the export and confirms it', async () => {
    renderPage([
      tableMock([]),
      excelMock(CRM_EXCEL_EXPORT, 'crmExcelExport', { filename: 'host-leads.xlsx', content_base64: 'RVhQT1JU' }),
    ]);
    await screen.findByText(/No host leads yet/i);

    fireEvent.click(screen.getByRole('button', { name: 'Export' }));

    expect(await screen.findByText('Host leads exported')).toBeInTheDocument();
    expect(utilsMocks.downloadBase64File).toHaveBeenCalledWith('RVhQT1JU', 'host-leads.xlsx', XLSX_MIME);
  });

  it('downloads the blank template from the toolbar', async () => {
    renderPage([
      tableMock([]),
      excelMock(CRM_EXCEL_TEMPLATE, 'crmExcelTemplate', { filename: 'host-template.xlsx', content_base64: 'VEVNUEw=' }),
    ]);
    await screen.findByText(/No host leads yet/i);

    // The toolbar tooltip names this button, so find it by its visible label.
    fireEvent.click(screen.getByText('Template'));

    expect(await screen.findByText('Template downloaded')).toBeInTheDocument();
    expect(utilsMocks.downloadBase64File).toHaveBeenCalledWith('VEVNUEw=', 'host-template.xlsx', XLSX_MIME);
  });

  it('reports an empty export instead of downloading nothing', async () => {
    renderPage([tableMock([]), excelMock(CRM_EXCEL_EXPORT, 'crmExcelExport', null)]);
    await screen.findByText(/No host leads yet/i);

    fireEvent.click(screen.getByRole('button', { name: 'Export' }));

    expect(await screen.findByText('Empty response')).toBeInTheDocument();
    expect(utilsMocks.downloadBase64File).not.toHaveBeenCalled();
  });

  it('imports a spreadsheet, reports the counts and reloads the table', async () => {
    renderPage([
      tableMock([]),
      {
        request: { query: CRM_EXCEL_INSPECT, variables: () => true },
        result: { data: { crmExcelInspect: { headers: ['host_name'], sample_rows: [] } } },
      },
      {
        request: {
          query: CRM_EXCEL_IMPORT,
          variables: (vars: Record<string, any>) =>
            vars.entity === 'HOST_LEAD' && vars.mapping[0].field === 'host_name' && vars.mapping[0].header === 'host_name',
        },
        result: { data: { crmExcelImport: { inserted: 2, failed: 1, errors: [{ row: 3, message: 'Host name is required' }] } } },
      },
      tableMock([hostLead()]),
    ]);
    await screen.findByText(/No host leads yet/i);

    fireEvent.click(screen.getByRole('button', { name: 'Import' }));
    const dialog = within(await screen.findByRole('dialog', { name: 'Import host leads from Excel' }));
    const input = document.querySelector<HTMLInputElement>('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [new File(['host_name\nRavi'], 'hosts.csv', { type: 'text/csv' })] } });
    fireEvent.click(await dialog.findByRole('button', { name: 'Import' }));

    expect(await screen.findByText('Imported 2 of 3 rows')).toBeInTheDocument();
    expect(await screen.findByText('Pune Runners')).toBeInTheDocument();
  });

  it('downloads the template from inside the import dialog', async () => {
    renderPage([
      tableMock([]),
      excelMock(CRM_EXCEL_TEMPLATE, 'crmExcelTemplate', { filename: 'host-template.xlsx', content_base64: 'VEVNUEw=' }),
    ]);
    await screen.findByText(/No host leads yet/i);

    fireEvent.click(screen.getByRole('button', { name: 'Import' }));
    const dialog = within(await screen.findByRole('dialog', { name: 'Import host leads from Excel' }));
    fireEvent.click(dialog.getByRole('button', { name: 'Download template' }));

    await waitFor(() =>
      expect(utilsMocks.downloadBase64File).toHaveBeenCalledWith('VEVNUEw=', 'host-template.xlsx', XLSX_MIME),
    );
  });
});

describe('HostLeadsPage Fill with AI', () => {
  it.each([
    { records: [{ host_name: 'Ravi Sharma', city: 'Pune' }], toast: 'Created 1 host lead' },
    {
      records: [
        { host_name: 'Ravi Sharma', city: 'Pune' },
        { host_name: 'Meera Shah', city: 'Mumbai' },
      ],
      toast: 'Created 2 host leads',
    },
  ])('announces "$toast" and reloads the table', async ({ records, toast }) => {
    renderPage([
      tableMock([]),
      {
        request: { query: AI_PARSE_CRM_LEADS, variables: { entity: 'HOST_LEAD', text: 'hosts brief' } },
        result: { data: { aiParseCrmLeads: JSON.stringify(records) } },
      },
      { request: { query: CREATE_HOST_LEAD, variables: () => true }, result: { data: { createHostLead: hostLead() } }, maxUsageCount: 2 },
      tableMock([hostLead()]),
    ]);
    await screen.findByText(/No host leads yet/i);

    fireEvent.click(screen.getByText('Fill with AI'));
    const dialog = within(await screen.findByRole('dialog', { name: 'Fill host leads with AI' }));
    fireEvent.change(dialog.getByRole('textbox', { name: 'Paste text here' }), { target: { value: 'hosts brief' } });
    fireEvent.click(dialog.getByRole('button', { name: 'Parse' }));
    fireEvent.click(await dialog.findByRole('button', { name: `Confirm & save ${records.length}` }));

    expect(await screen.findByText(toast)).toBeInTheDocument();
    expect(await screen.findByText('Pune Runners')).toBeInTheDocument();
  });
});

describe('HostLeadsPage navigation and dialogs', () => {
  const renderRouted = (mocks: MockedResponse[]) =>
    renderWithApollo(<HostLeadsPage />, mocks, { route: '/host-leads', path: '/host-leads' });

  it('opens the services catalogue', async () => {
    renderRouted([tableMock([])]);
    await screen.findByText(/No host leads yet/i);

    fireEvent.click(screen.getByText('Manage Host Services'));

    expect(screen.getByTestId('location')).toHaveTextContent('/host-leads/services');
  });

  it('opens the create form', async () => {
    renderRouted([tableMock([])]);
    await screen.findByText(/No host leads yet/i);

    fireEvent.click(screen.getByRole('button', { name: 'New Host Lead' }));

    expect(screen.getByTestId('location')).toHaveTextContent('/host-leads/new');
  });

  it('opens a row in the editor', async () => {
    renderRouted([tableMock([hostLead()])]);
    await screen.findByText('Pune Runners');

    fireEvent.click(screen.getByLabelText('Edit lead'));

    expect(screen.getByTestId('location')).toHaveTextContent('/host-leads/host-1');
  });

  it('closes the AI and import dialogs without saving anything', async () => {
    renderRouted([tableMock([])]);
    await screen.findByText(/No host leads yet/i);

    fireEvent.click(screen.getByText('Fill with AI'));
    fireEvent.click(within(await screen.findByRole('dialog', { name: 'Fill host leads with AI' })).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());

    fireEvent.click(screen.getByRole('button', { name: 'Import' }));
    fireEvent.click(within(await screen.findByRole('dialog', { name: 'Import host leads from Excel' })).getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
