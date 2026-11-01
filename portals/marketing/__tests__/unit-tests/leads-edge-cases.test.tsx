import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, renderHook, screen, waitFor, within } from '@testing-library/react';
import { GraphQLError } from 'graphql';
import { MockedProvider } from '@apollo/client/testing/react';
import { renderWithProviders } from '../testkit';
import { __setTableRows } from './table-mock';
import {
  audienceListOwnersMock,
  createLeadMock,
  importLeadsMock,
  leadSummaryMock,
  makeImportResult,
  makeLeadDetail,
  makeLeadNote,
  makeLeadRow,
  makeLeadSummary,
  marketingLeadMock,
} from '../mocks';

vi.mock('@duncit/table', () => import('./table-mock'));
vi.mock('@duncit/user-context', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/user-context')>()),
  useUserData: () => ({ user: { user_id: 'u1', roles: ['MARKETING_MANAGER'] } }),
}));
vi.mock('@duncit/app-settings', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/app-settings')>()),
  useDateFormat: () => ({ formatDateTime: (d: Date | string) => `fmt:${String(d)}` }),
}));
const dialogsMock = vi.hoisted(() => ({ notify: vi.fn() }));
vi.mock('@duncit/dialogs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/dialogs')>()),
  notify: dialogsMock.notify,
}));

import LeadsPage from '../../src/pages/leads-page';
import LeadContacts from '../../src/pages/leads-page/drawer/LeadContacts';
import LeadNotes from '../../src/pages/leads-page/drawer/LeadNotes';
import LeadOwnerDialog from '../../src/pages/leads-page/drawer/LeadOwnerDialog';
import PromoteDialog from '../../src/pages/leads-page/drawer/PromoteDialog';
import { useLeadActions } from '../../src/pages/leads-page/drawer/useLeadActions';
import ImportCsvDialog from '../../src/pages/leads-page/import-csv/ImportCsvDialog';
import ImportMappingFields from '../../src/pages/leads-page/import-csv/ImportMappingFields';
import { ImportOutcome, ImportPreview } from '../../src/pages/leads-page/import-csv/ImportPreview';
import { emptyMapping } from '../../src/pages/leads-page/import-csv/importMapping';
import { useCsvFile } from '../../src/pages/leads-page/import-csv/useCsvFile';
import { NewLeadDialog, blankNewLeadValues, toLeadInput } from '../../src/pages/leads-page/new-lead-form';
import { SET_MARKETING_LEAD_STAGE } from '../../src/pages/leads-page/queries';
import { AUDIENCE_LIST_OWNERS } from '../../src/pages/target-audience-page/queries';

/** What the guide kit remembers for u1 once the Leads tour has been shown. */
const TOUR_SEEN = ['duncit.tours.completed.u1', '["marketing.leads"]'] as const;

beforeEach(() => {
  localStorage.setItem(...TOUR_SEEN);
});

afterEach(() => {
  __setTableRows([]);
  vi.clearAllMocks();
});

const settle = () => new Promise((resolve) => setTimeout(resolve, 20));

const pickOption = async (combobox: HTMLElement, label: string) => {
  fireEvent.mouseDown(combobox);
  fireEvent.click(within(await screen.findByRole('listbox')).getByRole('option', { name: label }));
};

describe('LeadsPage after a new lead', () => {
  it('reloads the grid and the stage cards, and opens the lead it made', async () => {
    const made = makeLeadDetail({ id: 'l9', name: 'Green Cafe' });
    const input = toLeadInput({ ...blankNewLeadValues(), name: 'Green Cafe', pipeline: 'VENUE' });
    renderWithProviders(<LeadsPage />, {
      initialEntries: ['/leads'],
      mocks: [
        { ...leadSummaryMock(makeLeadSummary()), maxUsageCount: 1 },
        leadSummaryMock(makeLeadSummary({ total: 13 })),
        createLeadMock(input, made),
        marketingLeadMock(made),
      ],
    });
    await waitFor(() => expect(screen.getByTestId('lead-card-ALL')).toHaveTextContent('12'));
    expect(await screen.findByTestId('table-empty')).toBeInTheDocument();

    __setTableRows([makeLeadRow({ id: 'l9', name: 'Green Cafe' })]);
    fireEvent.click(screen.getByRole('button', { name: 'New lead' }));
    const dialog = screen.getByRole('dialog', { name: 'New lead' });
    fireEvent.change(within(dialog).getByLabelText('Name'), { target: { value: 'Green Cafe' } });
    await pickOption(within(dialog).getByRole('combobox', { name: 'Pipeline' }), 'Venue');
    fireEvent.click(within(dialog).getByTestId('new-lead-submit'));

    expect(await screen.findByRole('heading', { level: 2, name: 'Green Cafe' })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId('lead-card-ALL')).toHaveTextContent('13'));
    expect(screen.getAllByTestId('table-row')).toHaveLength(1);
  });
});

describe('NewLeadDialog', () => {
  it('neither celebrates nor closes when the server brings nothing back', async () => {
    const onClose = vi.fn();
    const onCreated = vi.fn();
    const input = toLeadInput({ ...blankNewLeadValues(), name: 'Blue Cafe', pipeline: 'VENUE' });
    renderWithProviders(<NewLeadDialog open onClose={onClose} onCreated={onCreated} />, {
      mocks: [{ ...createLeadMock(input, makeLeadDetail()), result: { data: null } }],
    });
    const dialog = screen.getByRole('dialog', { name: 'New lead' });
    fireEvent.change(within(dialog).getByLabelText('Name'), { target: { value: 'Blue Cafe' } });
    await pickOption(within(dialog).getByRole('combobox', { name: 'Pipeline' }), 'Venue');
    fireEvent.click(within(dialog).getByTestId('new-lead-submit'));
    await settle();
    expect(dialogsMock.notify).not.toHaveBeenCalled();
    expect(onCreated).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(within(dialog).getByLabelText('Name')).toHaveValue('Blue Cafe');
  });
});

describe('LeadContacts', () => {
  it('opens a website that already names its scheme as it is', () => {
    renderWithProviders(<LeadContacts lead={makeLeadDetail({ website: 'HTTP://bluecafe.in/menu', phones: [], emails: [], instagram_handle: '' })} />);
    expect(screen.getByRole('link', { name: 'HTTP://bluecafe.in/menu' })).toHaveAttribute('href', 'HTTP://bluecafe.in/menu');
    expect(screen.queryByText('No phone, email, website or handle yet.')).not.toBeInTheDocument();
  });
});

describe('LeadNotes', () => {
  it('says a note is needed once the box is left empty, and keeps Add from sending it', async () => {
    const onAdd = vi.fn();
    renderWithProviders(<LeadNotes notes={[]} busy={false} onAdd={onAdd} />);
    const box = screen.getByRole('textbox', { name: 'Add a note' });
    expect(screen.getByText('What was said, what to do next.')).toBeInTheDocument();
    fireEvent.blur(box);
    expect(screen.getByText('Write the note first.')).toBeInTheDocument();
    expect(box).toHaveAttribute('aria-invalid', 'true');
    fireEvent.click(screen.getByTestId('lead-add-note'));
    expect(onAdd).not.toHaveBeenCalled();
  });

  it('signs each note with what is known: the writer, the time, or both', () => {
    renderWithProviders(
      <LeadNotes
        notes={[
          makeLeadNote({ text: 'Undated', at: null }),
          makeLeadNote({ text: 'Unsigned', by_name: '' }),
          makeLeadNote({ text: 'Both', at: '2026-10-31T09:00:00.000Z' }),
        ]}
        busy={false}
        onAdd={vi.fn()}
      />,
    );
    const items = screen.getAllByRole('listitem');
    expect(items.map((item) => item.textContent)).toEqual([
      'BothAsha Rao · fmt:2026-10-31T09:00:00.000Z',
      'Unsignedfmt:2026-10-30T10:00:00.000Z',
      'UndatedAsha Rao',
    ]);
  });
});

describe('LeadOwnerDialog', () => {
  it('asks the question it is given, and saves nobody once the owner is cleared', async () => {
    const onClose = vi.fn();
    const onSave = vi.fn().mockResolvedValue(true);
    renderWithProviders(<LeadOwnerDialog ownerUserId="me" title="Who handles this comment?" busy={false} onClose={onClose} onSave={onSave} />, {
      mocks: [audienceListOwnersMock],
    });
    const dialog = screen.getByRole('dialog', { name: 'Who handles this comment?' });
    const input = within(dialog).getByRole('combobox', { name: 'Owner' });
    await waitFor(() => expect(input).toHaveValue('Asha Rao'));
    // The clear button is hidden until the field has focus, as it is for a pointer user.
    expect(within(dialog).queryByRole('button', { name: 'Clear' })).not.toBeInTheDocument();
    fireEvent.focus(input);
    fireEvent.click(within(dialog).getByRole('button', { name: 'Clear' }));
    expect(input).toHaveValue('');
    fireEvent.click(within(dialog).getByTestId('lead-owner-save'));
    await waitFor(() => expect(onSave).toHaveBeenCalledWith(null));
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  it('asks about the lead by default, says when the people cannot be read, and stays open when the save fails', async () => {
    const onClose = vi.fn();
    const onSave = vi.fn().mockResolvedValue(false);
    renderWithProviders(<LeadOwnerDialog ownerUserId={null} busy={false} onClose={onClose} onSave={onSave} />, {
      mocks: [{ request: { query: AUDIENCE_LIST_OWNERS }, result: { errors: [new GraphQLError('People list unavailable')] } }],
    });
    const dialog = screen.getByRole('dialog', { name: 'Who works this lead?' });
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('People list unavailable');
    fireEvent.click(within(dialog).getByTestId('lead-owner-save'));
    await waitFor(() => expect(onSave).toHaveBeenCalledWith(null));
    await settle();
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe('PromoteDialog', () => {
  it('picks a venue for a pipeline with no CRM kind of its own, and stays open when the promotion fails', async () => {
    const onClose = vi.fn();
    const onPromote = vi.fn().mockResolvedValue(false);
    renderWithProviders(<PromoteDialog lead={makeLeadDetail({ pipeline: 'GENERAL' })} busy={false} onClose={onClose} onPromote={onPromote} />);
    const dialog = screen.getByRole('dialog', { name: 'Promote to the CRM' });
    expect(within(dialog).getByTestId('lead-promote-kind')).toHaveValue('VENUE');
    expect(dialog).toHaveTextContent('A venue lead is created in the CRM from this General lead.');
    fireEvent.click(within(dialog).getByTestId('lead-promote-confirm'));
    await waitFor(() => expect(onPromote).toHaveBeenCalledWith('VENUE'));
    await settle();
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe('useLeadActions', () => {
  it('reports no change, and says nothing, when the server answers without the lead', async () => {
    const onChanged = vi.fn();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <MockedProvider
        mocks={[
          {
            request: { query: SET_MARKETING_LEAD_STAGE, variables: { id: 'l1', stage: 'CONTACTED', note: null } },
            result: { data: { setMarketingLeadStage: null } },
          },
        ]}
      >
        {children}
      </MockedProvider>
    );
    const { result } = renderHook(() => useLeadActions('l1', onChanged), { wrapper });
    let kept: boolean | undefined;
    await act(async () => {
      kept = await result.current.setStage('CONTACTED');
    });
    expect(kept).toBe(false);
    expect(onChanged).not.toHaveBeenCalled();
    expect(dialogsMock.notify).not.toHaveBeenCalled();
  });
});

describe('ImportCsvDialog', () => {
  it('shows no outcome and reloads nothing when the server brings nothing back', async () => {
    const onImported = vi.fn();
    const rows = [['Blue Cafe', 'hi@bluecafe.in']];
    renderWithProviders(<ImportCsvDialog open onClose={vi.fn()} onImported={onImported} />, {
      mocks: [{ ...importLeadsMock(rows, { name: 0, email: 1, pipeline: 'GENERAL' }, makeImportResult()), result: { data: null } }],
    });
    fireEvent.change(screen.getByTestId('import-file'), { target: { files: [new File(['Name,Email\nBlue Cafe,hi@bluecafe.in\n'], 'leads.csv')] } });
    await screen.findByTestId('import-file-read');
    fireEvent.click(screen.getByTestId('import-submit'));
    await settle();
    expect(screen.queryByTestId('import-result')).not.toBeInTheDocument();
    expect(screen.getByTestId('import-submit')).toBeInTheDocument();
    expect(onImported).not.toHaveBeenCalled();
    expect(dialogsMock.notify).not.toHaveBeenCalled();
  });
});

describe('ImportMappingFields', () => {
  it('names a column with no header by its position', () => {
    renderWithProviders(
      <ImportMappingFields header={['Name', '']} mapping={{ ...emptyMapping(), name: 0, email: 1 }} onChange={vi.fn()} pipeline="GENERAL" onPipeline={vi.fn()} />,
    );
    expect(screen.getByTestId('import-map-email')).toHaveValue('1');
    expect(screen.getByRole('combobox', { name: /Email/ })).toHaveTextContent('#2');
    expect(screen.getByRole('combobox', { name: /Name/ })).toHaveTextContent('Name');
  });
});

describe('ImportPreview', () => {
  it('leaves a cell blank where a row is shorter than the column it is mapped to', () => {
    renderWithProviders(<ImportPreview rows={[['Blue Cafe'], ['Rani Events', 'rani@events.in']]} mapping={{ ...emptyMapping(), name: 0, email: 1 }} />);
    const table = screen.getByRole('table', { name: 'First rows' });
    expect(within(table).getAllByRole('columnheader').map((cell) => cell.textContent)).toEqual(['Name', 'Email']);
    const [, first, second] = within(table).getAllByRole('row');
    expect(within(first).getAllByRole('cell').map((cell) => cell.textContent)).toEqual(['Blue Cafe', '']);
    expect(within(second).getAllByRole('cell').map((cell) => cell.textContent)).toEqual(['Rani Events', 'rani@events.in']);
  });
});

describe('ImportOutcome', () => {
  it('warns when nothing was added or merged, and lists the skipped rows', () => {
    renderWithProviders(
      <ImportOutcome
        result={makeImportResult({
          added: 0,
          merged: 0,
          skipped: 2,
          rows: [
            { row: 1, outcome: 'SKIPPED', reason: 'No name', lead_id: '' },
            { row: 2, outcome: 'SKIPPED', reason: '"12" is not a phone number', lead_id: '' },
          ],
        })}
      />,
    );
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('0 added, 0 merged, 2 skipped.');
    expect(alert.className).toMatch(/MuiAlert-\w*Warning/);
    expect(screen.getByText('Skipped rows')).toBeInTheDocument();
    expect(screen.getByText('Row 1 · No name')).toBeInTheDocument();
  });

  it('confirms an import that added rows, and lists nothing when none were skipped', () => {
    renderWithProviders(<ImportOutcome result={makeImportResult({ skipped: 0, rows: [{ row: 1, outcome: 'ADDED', reason: '', lead_id: 'l1' }] })} />);
    expect(screen.getByRole('alert').className).toMatch(/MuiAlert-\w*Success/);
    expect(screen.queryByText('Skipped rows')).not.toBeInTheDocument();
  });
});

describe('useCsvFile', () => {
  const withReader = async (reader: object, run: () => Promise<void>) => {
    const RealReader = globalThis.FileReader;
    globalThis.FileReader = function FakeReader() {
      return reader;
    } as unknown as typeof FileReader;
    try {
      await run();
    } finally {
      globalThis.FileReader = RealReader;
    }
  };
  const csvFile = () => new File(['Name\nBlue Cafe\n'], 'leads.csv');

  it('does nothing when no file was picked', async () => {
    const { result } = renderHook(() => useCsvFile());
    await act(async () => {
      await result.current.choose(undefined);
    });
    expect(result.current.file).toBeNull();
    expect(result.current.problem).toBe('');
  });

  it('reads a file the browser hands back nothing for as having no rows', async () => {
    const reader: { onload: (() => void) | null; result: null; readAsText: () => void } = {
      onload: null,
      result: null,
      readAsText: () => reader.onload?.(),
    };
    await withReader(reader, async () => {
      const { result } = renderHook(() => useCsvFile());
      await act(async () => {
        await result.current.choose(csvFile());
      });
      expect(result.current.file).toBeNull();
      expect(result.current.problem).toBe('The file has no rows under its header.');
    });
  });

  it('says the file could not be read when the browser fails without saying why', async () => {
    const reader: { onerror: (() => void) | null; error: null; readAsText: () => void } = {
      onerror: null,
      error: null,
      readAsText: () => reader.onerror?.(),
    };
    await withReader(reader, async () => {
      const { result } = renderHook(() => useCsvFile());
      await act(async () => {
        await result.current.choose(csvFile());
      });
      expect(result.current.file).toBeNull();
      expect(result.current.problem).toBe('The file could not be read. Try choosing it again.');
    });
  });
});
