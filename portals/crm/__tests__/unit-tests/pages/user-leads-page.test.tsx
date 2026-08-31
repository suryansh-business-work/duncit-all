import '../helpers/agGridEnv';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { type MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { MemoryRouter } from 'react-router-dom';
import { logs } from '@duncit/logs';
import UserLeadsPage from '@/pages/user-leads/UserLeadsPage';
import {
  WA_EXPORT_USER_LEADS,
  WA_IMPORT_USER_LEADS,
  WA_LEAD_STATS,
  WA_DELETE_USER_LEADS,
  WA_USER_LEADS,
} from '@/pages/tools/whatsapp/whatsappQueries';

const utilsMocks = vi.hoisted(() => ({ downloadBase64File: vi.fn() }));

vi.mock('@duncit/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@duncit/utils')>();
  return { ...actual, downloadBase64File: utilsMocks.downloadBase64File };
});

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

const lead = {
  id: 'l1',
  phone: '919876543210',
  name: 'Asha Rao',
  source_account: 'acct-1',
  source_communities: [{ jid: 'c1@g.us', name: 'Mumbai Foodies' }],
  source_groups: [],
  imported_at: '2026-05-02T10:20:00.000Z',
};

const statsMock = (): MockedResponse => ({
  request: { query: WA_LEAD_STATS },
  result: {
    data: {
      waLeadStats: {
        total_leads: 1200,
        total_communities: 8,
        total_groups: 42,
        total_contacts: 3100,
      },
    },
  },
  maxUsageCount: 10,
});

const leadsMock = (): MockedResponse => ({
  request: {
    query: WA_USER_LEADS,
    variables: {
      input: { search: null, page: 1, page_size: 25, sort_by: 'imported_at', sort_dir: 'desc' },
    },
  },
  result: { data: { waUserLeads: { total: 1, page: 1, page_size: 25, items: [lead] } } },
  maxUsageCount: 10,
});

const renderPage = (extraMocks: MockedResponse[] = []) =>
  render(
    <MockedProvider mocks={[statsMock(), leadsMock(), ...extraMocks]}>
      <MemoryRouter>
        <UserLeadsPage />
      </MemoryRouter>
    </MockedProvider>,
  );

const fileInput = () => document.querySelector<HTMLInputElement>('input[type="file"]');

beforeEach(() => {
  window.localStorage.clear();
  utilsMocks.downloadBase64File.mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('UserLeadsPage', () => {
  it('renders the heading, the stat counters and the leads returned by waUserLeads', async () => {
    renderPage();

    expect(await screen.findByRole('heading', { name: 'WhatsApp Leads' })).toBeTruthy();
    expect(await screen.findByText('1,200')).toBeTruthy();
    expect(screen.getByText('Total Leads')).toBeTruthy();
    expect(await screen.findByText('Asha Rao')).toBeTruthy();
    expect(screen.getByText('Mumbai Foodies')).toBeTruthy();
  });

  it('offers the New / Import / Export toolbar actions', async () => {
    renderPage();
    await screen.findByText('Asha Rao');

    expect(screen.getByRole('button', { name: 'New' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Import' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Export' })).toBeTruthy();
  });

  it('opens the create dialog from the New action and closes it again on Cancel', async () => {
    renderPage();
    await screen.findByText('Asha Rao');

    fireEvent.click(screen.getByRole('button', { name: 'New' }));
    expect(await screen.findByText('New user lead')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    await vi.waitFor(() => expect(screen.queryByText('New user lead')).toBeNull());
  });

  it('opens the file picker when Import is clicked', async () => {
    const pickerClick = vi.spyOn(HTMLInputElement.prototype, 'click');
    renderPage();
    await screen.findByText('Asha Rao');

    fireEvent.click(screen.getByRole('button', { name: 'Import' }));

    expect(pickerClick).toHaveBeenCalledTimes(1);
    expect(pickerClick.mock.instances[0]).toBe(fileInput());
  });

  it('shows the empty state when waUserLeads returns no page at all', async () => {
    render(
      <MockedProvider
        mocks={[
          statsMock(),
          {
            request: {
              query: WA_USER_LEADS,
              variables: {
                input: {
                  search: null,
                  page: 1,
                  page_size: 25,
                  sort_by: 'imported_at',
                  sort_dir: 'desc',
                },
              },
            },
            result: { data: { waUserLeads: null } },
          },
        ]}
      >
        <MemoryRouter>
          <UserLeadsPage />
        </MemoryRouter>
      </MockedProvider>,
    );

    expect(await screen.findByText(/No WhatsApp leads yet/i)).toBeTruthy();
    expect(screen.queryByText('Asha Rao')).toBeNull();
  });

  it('downloads the server xlsx payload when Export is clicked', async () => {
    renderPage([
      {
        request: { query: WA_EXPORT_USER_LEADS, variables: { search: null } },
        result: { data: { waExportUserLeads: 'QkFTRTY0' } },
      },
    ]);
    await screen.findByText('Asha Rao');

    fireEvent.click(screen.getByRole('button', { name: 'Export' }));

    await vi.waitFor(() =>
      expect(utilsMocks.downloadBase64File).toHaveBeenCalledWith(
        'QkFTRTY0',
        'whatsapp-leads.xlsx',
        XLSX_MIME,
      ),
    );
  });

  it('does not download anything when the export query returns no payload', async () => {
    renderPage([
      {
        request: { query: WA_EXPORT_USER_LEADS, variables: { search: null } },
        result: { data: { waExportUserLeads: null } },
      },
    ]);
    await screen.findByText('Asha Rao');

    fireEvent.click(screen.getByRole('button', { name: 'Export' }));

    await vi.waitFor(() => expect(screen.getByRole('button', { name: 'Export' })).toBeTruthy());
    expect(utilsMocks.downloadBase64File).not.toHaveBeenCalled();
  });

  it('uploads the picked file as base64 and reports the import counts', async () => {
    renderPage([
      {
        request: { query: WA_IMPORT_USER_LEADS, variables: { file_base64: 'aGk=' } },
        result: { data: { waImportUserLeads: { imported: 2, duplicates: 1, skipped: 3 } } },
      },
    ]);
    await screen.findByText('Asha Rao');

    const input = fileInput();
    expect(input).not.toBeNull();
    fireEvent.change(input as HTMLInputElement, {
      target: { files: [new File(['hi'], 'leads.xlsx', { type: XLSX_MIME })] },
    });

    expect(await screen.findByText('Imported 2 new · 1 duplicates · 3 invalid skipped.')).toBeTruthy();
    // the picker is reset so re-selecting the same file fires change again
    expect((input as HTMLInputElement).value).toBe('');
  });

  it('logs a structured error instead of crashing when the import mutation fails', async () => {
    const logError = vi.spyOn(logs.portal.crm, 'error').mockImplementation(() => undefined);
    renderPage([
      {
        request: { query: WA_IMPORT_USER_LEADS, variables: { file_base64: 'aGk=' } },
        error: new Error('upload rejected'),
      },
    ]);
    await screen.findByText('Asha Rao');

    fireEvent.change(fileInput() as HTMLInputElement, {
      target: { files: [new File(['hi'], 'leads.xlsx', { type: XLSX_MIME })] },
    });

    await vi.waitFor(() =>
      expect(logError).toHaveBeenCalledWith(
        'user-leads',
        'onImport',
        expect.objectContaining({ msg: 'Failed to import user leads' }),
      ),
    );
    expect(screen.queryByText(/invalid skipped/)).toBeNull();
  });

  it('ignores a change event that carries no file', async () => {
    const logError = vi.spyOn(logs.portal.crm, 'error').mockImplementation(() => undefined);
    renderPage();
    await screen.findByText('Asha Rao');

    fireEvent.change(fileInput() as HTMLInputElement, { target: { files: [] } });

    expect(logError).not.toHaveBeenCalled();
    expect(screen.queryByText(/invalid skipped/)).toBeNull();
  });

  it('confirms a row delete and announces how many leads were removed', async () => {
    renderPage([
      {
        request: { query: WA_DELETE_USER_LEADS, variables: { ids: ['l1'] } },
        result: { data: { waDeleteUserLeads: 1 } },
      },
    ]);
    await screen.findByText('Asha Rao');

    fireEvent.click(screen.getByLabelText('Delete lead'));
    expect(await screen.findByText('Delete lead?')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    expect(await screen.findByText('Deleted 1 lead.')).toBeTruthy();
  });

  it('reports zeros when the import mutation answers without counts', async () => {
    renderPage([
      {
        request: { query: WA_IMPORT_USER_LEADS, variables: { file_base64: 'aGk=' } },
        result: { data: { waImportUserLeads: null } },
      },
    ]);
    await screen.findByText('Asha Rao');

    fireEvent.change(fileInput() as HTMLInputElement, {
      target: { files: [new File(['hi'], 'leads.xlsx', { type: XLSX_MIME })] },
    });

    expect(
      await screen.findByText('Imported 0 new · 0 duplicates · 0 invalid skipped.'),
    ).toBeTruthy();
  });

  it('dismisses the toast when the snackbar is closed', async () => {
    renderPage([
      {
        request: { query: WA_DELETE_USER_LEADS, variables: { ids: ['l1'] } },
        result: { data: { waDeleteUserLeads: 1 } },
      },
    ]);
    await screen.findByText('Asha Rao');
    fireEvent.click(screen.getByLabelText('Delete lead'));
    fireEvent.click(await screen.findByRole('button', { name: 'Delete' }));
    await screen.findByText('Deleted 1 lead.');

    fireEvent.keyDown(document.body, { key: 'Escape' });

    await vi.waitFor(() => expect(screen.queryByText('Deleted 1 lead.')).toBeNull());
  });

  it('closes the delete confirmation without deleting when Cancel is pressed', async () => {
    renderPage();
    await screen.findByText('Asha Rao');

    fireEvent.click(screen.getByLabelText('Delete lead'));
    expect(await screen.findByText('Delete lead?')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    await vi.waitFor(() => expect(screen.queryByText('Delete lead?')).toBeNull());
    expect(screen.queryByText(/Deleted/)).toBeNull();
  });

  it('opens the edit dialog pre-filled with the clicked lead and closes it on Cancel', async () => {
    renderPage();
    await screen.findByText('Asha Rao');

    fireEvent.click(screen.getByLabelText('Edit lead'));
    expect(await screen.findByDisplayValue('Asha Rao')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    await vi.waitFor(() => expect(screen.queryByDisplayValue('Asha Rao')).toBeNull());
  });
});
