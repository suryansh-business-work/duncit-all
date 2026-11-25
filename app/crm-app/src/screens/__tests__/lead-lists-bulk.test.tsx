import { act, fireEvent, screen, within } from '@testing-library/react-native';
import * as DocumentPicker from 'expo-document-picker';

import * as editorDocs from '@/graphql/leadEditor';
import * as docs from '@/graphql/leadLists';
import { readFileBase64 } from '@/features/leads-list/readFileBase64';
import { gqlRequest } from '@/services/graphql.client';
import { renderWithTheme } from '@/test-utils';
import { LeadListScreen } from '../leads/LeadListScreen';

jest.mock('crm-telephony', () => ({ CrmTelephony: null }));
jest.mock('@/services/graphql.client', () => ({ gqlRequest: jest.fn() }));
jest.mock('@/features/leads-list/readFileBase64', () => ({ readFileBase64: jest.fn() }));
const mockNav = { navigate: jest.fn(), setOptions: jest.fn() };
let mockKind = 'VENUE_LEAD';
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNav,
  useRoute: () => ({ params: { kind: mockKind } }),
  useFocusEffect: (fn: () => void) =>
    jest.requireActual<typeof import('react')>('react').useEffect(fn, [fn]),
}));

/** Leads › Venue / Host › Fill with AI and Import from Excel, as the portal's dialogs do them. */

const request = gqlRequest as jest.Mock;
const WAIT = { timeout: 3000 };
type Handler = (vars: Record<string, unknown>) => unknown;
const serve = (overrides: Map<unknown, Handler> = new Map()) =>
  request.mockImplementation(async (doc: unknown, vars: Record<string, unknown> = {}) => {
    const handler = overrides.get(doc);
    if (handler) return handler(vars);
    if (doc === docs.CrmAppVenueLeadsTableDocument)
      return { venueLeadsTable: { total: 0, unplaced: null, rows: [] } };
    if (doc === docs.CrmAppHostLeadsTableDocument)
      return { hostLeadsTable: { total: 0, unplaced: null, rows: [] } };
    throw new Error('unexpected operation');
  });
const callsTo = (doc: unknown) => request.mock.calls.filter(([d]) => d === doc);
const open = async () => {
  renderWithTheme(<LeadListScreen />);
  await screen.findByText(
    mockKind === 'VENUE_LEAD'
      ? 'No venue leads yet. Click "New Venue Lead" to create the first one.'
      : 'No host leads yet. Click "New Host Lead" to create the first one.',
    {},
    WAIT,
  );
};
const RECORDS = JSON.stringify({
  records: [
    {
      venue_name: 'Sunset Courts',
      city: '',
      full_address: '12 Church St',
      contacts: [{ mobile_number: '9000000001' }],
    },
    {
      venue_name: 'Grand Hall',
      city: 'Pune',
      full_address: 'FC Road',
      lead_status: 'Contacted',
      priority: 'High',
    },
  ],
});

beforeEach(() => {
  jest.clearAllMocks();
  mockKind = 'VENUE_LEAD';
});

describe('LeadListScreen › Fill with AI', () => {
  it('asks for text, then creates the valid leads and keeps the rest with their reason', async () => {
    let createFails = false;
    serve(
      new Map<unknown, Handler>([
        [docs.CrmAppAiParseLeadsDocument, () => ({ aiParseCrmLeads: RECORDS })],
        [
          editorDocs.CrmAppCreateVenueLeadDocument,
          () => {
            if (createFails) throw new Error('Phone already on another lead');
            return { createVenueLead: { id: 'new' } };
          },
        ],
      ]),
    );
    await open();
    fireEvent.press(screen.getByTestId('lead-list-ai'));
    expect(screen.getByText('Fill venue leads with AI')).toBeOnTheScreen();
    await act(async () => fireEvent.press(screen.getByTestId('ai-parse')));
    expect(
      within(screen.getByTestId('ai-error')).getByText('Paste some text to parse first.'),
    ).toBeOnTheScreen();
    fireEvent.changeText(screen.getByTestId('ai-text'), 'Sunset Courts, Grand Hall in Pune');
    await act(async () => fireEvent.press(screen.getByTestId('ai-parse')));
    expect(request).toHaveBeenCalledWith(docs.CrmAppAiParseLeadsDocument, {
      entity: 'VENUE_LEAD',
      text: 'Sunset Courts, Grand Hall in Pune',
    });
    expect(
      screen.getByText('2 records found. Edit any field, then Confirm & save.'),
    ).toBeOnTheScreen();
    expect(screen.getByTestId('ai-row-1-lead_status').props.value).toBe('Contacted');
    await act(async () => fireEvent.press(screen.getByTestId('ai-save')));
    expect(callsTo(editorDocs.CrmAppCreateVenueLeadDocument)).toHaveLength(1);
    expect(callsTo(editorDocs.CrmAppCreateVenueLeadDocument)[0][1].input).toMatchObject({
      venue_name: 'Grand Hall',
      city: 'Pune',
      lead_status: 'Contacted',
    });
    expect(
      within(screen.getByTestId('ai-error')).getByText(
        '1 created · 1 need fixing (see the rows below).',
      ),
    ).toBeOnTheScreen();
    expect(screen.getByTestId('ai-row-0-error')).toHaveTextContent('Issue: City is required');
    expect(screen.getByTestId('lead-list-status')).toHaveTextContent('Created 1 venue lead');
    createFails = true;
    fireEvent.changeText(screen.getByTestId('ai-row-0-city'), 'Bengaluru');
    await act(async () => fireEvent.press(screen.getByTestId('ai-save')));
    expect(screen.getByTestId('ai-row-0-error')).toHaveTextContent(
      'Issue: Phone already on another lead',
    );
    createFails = false;
    await act(async () => fireEvent.press(screen.getByTestId('ai-save')));
    expect(screen.queryByTestId('ai-sheet')).toBeNull();
    expect(callsTo(editorDocs.CrmAppCreateVenueLeadDocument).at(-1)?.[1].input).toMatchObject({
      venue_name: 'Sunset Courts',
      city: 'Bengaluru',
      contacts: [{ name: 'Sunset Courts', mobile_number: '9000000001' }],
    });
  });

  it('says when the AI found nothing or failed, goes back to the text, and creates host leads for hosts', async () => {
    mockKind = 'HOST_LEAD';
    const answers: Handler[] = [
      () => ({ aiParseCrmLeads: '[]' }),
      () => {
        throw new Error('AI is busy');
      },
      () => ({ aiParseCrmLeads: JSON.stringify([{ host_name: 'Pune Runners' }]) }),
      () => ({ aiParseCrmLeads: JSON.stringify([{ host_name: 'Pune Runners' }]) }),
    ];
    serve(
      new Map<unknown, Handler>([
        [docs.CrmAppAiParseLeadsDocument, (vars) => answers.shift()?.(vars)],
        [editorDocs.CrmAppCreateHostLeadDocument, () => ({ createHostLead: { id: 'h9' } })],
      ]),
    );
    await open();
    fireEvent.press(screen.getByTestId('lead-list-ai'));
    fireEvent.changeText(screen.getByTestId('ai-text'), 'runners');
    await act(async () => fireEvent.press(screen.getByTestId('ai-parse')));
    expect(
      within(screen.getByTestId('ai-error')).getByText(
        'No leads found in that text. Add more detail and retry.',
      ),
    ).toBeOnTheScreen();
    await act(async () => fireEvent.press(screen.getByTestId('ai-parse')));
    expect(within(screen.getByTestId('ai-error')).getByText('AI is busy')).toBeOnTheScreen();
    await act(async () => fireEvent.press(screen.getByTestId('ai-parse')));
    expect(screen.queryByTestId('ai-row-0-full_address')).toBeNull();
    fireEvent.press(screen.getByTestId('ai-back'));
    expect(screen.getByTestId('ai-text').props.value).toBe('runners');
    await act(async () => fireEvent.press(screen.getByTestId('ai-parse')));
    expect(
      screen.getByText('1 record found. Edit any field, then Confirm & save.'),
    ).toBeOnTheScreen();
    await act(async () => fireEvent.press(screen.getByTestId('ai-save')));
    expect(callsTo(editorDocs.CrmAppCreateHostLeadDocument)[0][1].input).toMatchObject({
      host_name: 'Pune Runners',
    });
    expect(screen.getByTestId('lead-list-status')).toHaveTextContent('Created 1 host lead');
  });
});

describe('LeadListScreen › Import from Excel', () => {
  const picked = {
    canceled: false,
    assets: [{ uri: 'file:///cache/leads.xlsx', name: 'leads.xlsx' }],
  };

  it('reads the file’s columns, maps them, imports and shows every failed row', async () => {
    (readFileBase64 as jest.Mock).mockResolvedValue('QkFTRTY0');
    (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValueOnce(picked);
    serve(
      new Map<unknown, Handler>([
        [
          docs.CrmAppExcelInspectDocument,
          () => ({ crmExcelInspect: { headers: ['Venue Name', 'City', 'Full Address', 'Notes'] } }),
        ],
        [
          docs.CrmAppExcelImportDocument,
          () => ({
            crmExcelImport: { inserted: 8, failed: 2, errors: [{ row: 3, message: 'Bad phone' }] },
          }),
        ],
      ]),
    );
    await open();
    fireEvent.press(screen.getByTestId('lead-list-import'));
    expect(screen.getByTestId('import-file-name')).toHaveTextContent('No file selected');
    await act(async () => fireEvent.press(screen.getByTestId('import-choose')));
    expect(readFileBase64).toHaveBeenCalledWith('file:///cache/leads.xlsx');
    expect(request).toHaveBeenCalledWith(docs.CrmAppExcelInspectDocument, {
      content_base64: 'QkFTRTY0',
    });
    expect(
      within(screen.getByTestId('import-field-venue_name')).getByText('Venue Name'),
    ).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('import-field-remarks-pick'));
    fireEvent.press(screen.getByTestId('import-field-remarks-Notes'));
    await act(async () => fireEvent.press(screen.getByTestId('import-run')));
    const vars = callsTo(docs.CrmAppExcelImportDocument)[0][1];
    expect(vars).toMatchObject({ entity: 'VENUE_LEAD', content_base64: 'QkFTRTY0' });
    expect(vars.mapping).toEqual(
      expect.arrayContaining([
        { field: 'venue_name', header: 'Venue Name' },
        { field: 'city', header: 'City' },
        { field: 'full_address', header: 'Full Address' },
        { field: 'remarks', header: 'Notes' },
      ]),
    );
    expect(screen.getByTestId('import-summary')).toHaveTextContent(
      'Imported 8 of 10 rows · 2 failed',
    );
    expect(screen.getByText('Row 3')).toBeOnTheScreen();
    expect(screen.getByText('Reason: Bad phone')).toBeOnTheScreen();
    expect(screen.getByTestId('lead-list-status')).toHaveTextContent(
      'Imported 8 of 10 rows · 2 failed',
    );
    fireEvent.press(screen.getByTestId('import-close'));
    expect(screen.queryByTestId('import-sheet')).toBeNull();
  });

  it('does nothing when no file is picked, and says when the file has no columns or the import fails', async () => {
    (readFileBase64 as jest.Mock).mockResolvedValue('QkFTRTY0');
    const inspect: Handler[] = [
      () => ({ crmExcelInspect: { headers: [] } }),
      () => ({ crmExcelInspect: { headers: ['Foo', 'City'] } }),
    ];
    serve(
      new Map<unknown, Handler>([
        [docs.CrmAppExcelInspectDocument, (vars) => inspect.shift()?.(vars)],
        [
          docs.CrmAppExcelImportDocument,
          () => {
            throw new Error('Import failed on the server');
          },
        ],
      ]),
    );
    await open();
    fireEvent.press(screen.getByTestId('lead-list-import'));
    await act(async () => fireEvent.press(screen.getByTestId('import-choose')));
    expect(readFileBase64).not.toHaveBeenCalled();
    (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValueOnce(picked);
    await act(async () => fireEvent.press(screen.getByTestId('import-choose')));
    expect(
      within(screen.getByTestId('import-error')).getByText(
        'No column headers found in the first row.',
      ),
    ).toBeOnTheScreen();
    (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValueOnce(picked);
    await act(async () => fireEvent.press(screen.getByTestId('import-choose')));
    await act(async () => fireEvent.press(screen.getByTestId('import-run')));
    expect(callsTo(docs.CrmAppExcelImportDocument)).toHaveLength(0);
    fireEvent.press(screen.getByTestId('import-field-venue_name-pick'));
    fireEvent.press(screen.getByTestId('import-field-venue_name-Foo'));
    fireEvent.press(screen.getByTestId('import-field-full_address-pick'));
    fireEvent.press(screen.getByTestId('import-field-full_address-Foo'));
    await act(async () => fireEvent.press(screen.getByTestId('import-run')));
    expect(
      within(screen.getByTestId('import-error')).getByText('Import failed on the server'),
    ).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('import-field-full_address-pick'));
    fireEvent.press(screen.getByTestId('import-field-full_address-ignore'));
    await act(async () => fireEvent.press(screen.getByTestId('import-run')));
    expect(callsTo(docs.CrmAppExcelImportDocument)).toHaveLength(1);
  });
});
