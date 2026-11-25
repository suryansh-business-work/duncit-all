import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Linking } from 'react-native';

import * as docs from '@/graphql/userLeads';
import { dialNumber } from '@/services/dialer';
import { gqlRequest } from '@/services/graphql.client';
import { renderWithTheme } from '@/test-utils';
import { UserLeadDetailScreen } from '../user-leads/UserLeadDetailScreen';
import { UserLeadEditorScreen } from '../user-leads/UserLeadEditorScreen';
import { UserLeadsScreen } from '../user-leads/UserLeadsScreen';

jest.mock('crm-telephony', () => ({ CrmTelephony: null }));
jest.mock('@/services/graphql.client', () => ({ gqlRequest: jest.fn() }));
jest.mock('@/services/dialer', () => ({
  dialNumber: jest.fn(async () => 'called'),
  whatsappUrl: (n: string) => `https://wa.me/${n}`,
}));
const mockNav = { navigate: jest.fn(), goBack: jest.fn(), setOptions: jest.fn() };
let mockParams: Record<string, unknown> = {};
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNav,
  useRoute: () => ({ params: mockParams }),
  useFocusEffect: (fn: () => void) =>
    jest.requireActual<typeof import('react')>('react').useEffect(fn, [fn]),
}));

const request = gqlRequest as jest.Mock;
const LEAD = {
  id: 'u1',
  phone: '919811000001',
  name: 'Asha',
  contact_jid: '919811000001@c.us',
  source_account: '919800000000',
  imported_at: '2026-11-20T10:00:00.000Z',
  source_communities: [{ jid: 'c1', name: 'Runners' }],
  source_groups: [],
};

type Handler = (vars: Record<string, unknown>) => unknown;
const serve = (overrides: Map<unknown, Handler> = new Map()) =>
  request.mockImplementation(async (doc: unknown, vars: Record<string, unknown> = {}) => {
    const handler = overrides.get(doc);
    if (handler) return handler(vars);
    if (doc === docs.CrmAppUserLeadStatsDocument)
      return {
        waLeadStats: { total_leads: 1, total_communities: 2, total_groups: 3, total_contacts: 4 },
      };
    if (doc === docs.CrmAppUserLeadsDocument) return { waUserLeads: { total: 1, items: [LEAD] } };
    if (doc === docs.CrmAppUserLeadDocument) return { waUserLead: LEAD };
    throw new Error('unexpected operation');
  });
const callsTo = (doc: unknown) => request.mock.calls.filter(([d]) => d === doc);

beforeEach(() => {
  jest.clearAllMocks();
  mockParams = {};
  serve();
});

describe('UserLeadsScreen', () => {
  it('shows the counts and the leads, searches, and opens a lead or the add form', async () => {
    renderWithTheme(<UserLeadsScreen />);
    expect(await screen.findByTestId('kpi-communities')).toHaveProp('aria-label', 'Communities: 2');
    expect(await screen.findByText('Asha', {}, { timeout: 2000 })).toBeOnTheScreen();
    fireEvent.changeText(screen.getByTestId('user-leads-search'), ' asha ');
    await waitFor(
      () =>
        expect(callsTo(docs.CrmAppUserLeadsDocument).at(-1)?.[1]).toEqual({
          input: { search: 'asha', page: 1, page_size: 25 },
        }),
      { timeout: 2000 },
    );
    fireEvent.press(screen.getByTestId('user-lead-row-u1'));
    expect(mockNav.navigate).toHaveBeenCalledWith('UserLeadDetail', { id: 'u1' });
    fireEvent.press(screen.getByTestId('user-leads-new'));
    expect(mockNav.navigate).toHaveBeenCalledWith('UserLeadEditor', {});
  });

  it('cleans the data after a confirm and says what it removed', async () => {
    serve(
      new Map([
        [
          docs.CrmAppCleanUserLeadsDocument,
          () => ({
            waCleanData: {
              removed_invalid: 2,
              removed_duplicates: 1,
              removed_contacts: 0,
              remaining: 9,
            },
          }),
        ],
      ]),
    );
    renderWithTheme(<UserLeadsScreen />);
    fireEvent.press(screen.getByTestId('user-leads-clean'));
    await act(async () => fireEvent.press(screen.getByTestId('user-leads-clean-dialog-confirm')));
    expect(screen.getByTestId('user-leads-cleaned')).toHaveTextContent(
      'Removed 2 invalid, 1 duplicates and 0 contacts; 9 leads remain.',
    );
  });

  it('keeps the confirm open with the reason when cleaning fails', async () => {
    serve(
      new Map([
        [
          docs.CrmAppCleanUserLeadsDocument,
          () => {
            throw new Error('Only CRM managers can clean data');
          },
        ],
      ]),
    );
    renderWithTheme(<UserLeadsScreen />);
    fireEvent.press(screen.getByTestId('user-leads-clean'));
    await act(async () => fireEvent.press(screen.getByTestId('user-leads-clean-dialog-confirm')));
    expect(screen.getByTestId('user-leads-clean-dialog-error')).toHaveTextContent(
      'Only CRM managers can clean data',
    );
    fireEvent.press(screen.getByTestId('user-leads-clean-dialog-cancel'));
  });
});

describe('UserLeadDetailScreen', () => {
  beforeEach(() => {
    mockParams = { id: 'u1' };
  });

  it('shows where the lead came from, and calls or WhatsApps it', async () => {
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    renderWithTheme(<UserLeadDetailScreen />);
    expect(await screen.findByText('Runners')).toBeOnTheScreen();
    expect(screen.getByText('+919800000000')).toBeOnTheScreen();
    expect(screen.getByText('None')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('user-lead-call'));
    expect(dialNumber).toHaveBeenCalledWith('919811000001');
    fireEvent.press(screen.getByTestId('user-lead-whatsapp'));
    expect(openURL).toHaveBeenCalledWith('https://wa.me/919811000001');
    fireEvent.press(screen.getByTestId('user-lead-edit'));
    expect(mockNav.navigate).toHaveBeenCalledWith('UserLeadEditor', { id: 'u1' });
  });

  it('deletes after a confirm and goes back', async () => {
    serve(new Map([[docs.CrmAppDeleteUserLeadDocument, () => ({ waDeleteUserLead: true })]]));
    renderWithTheme(<UserLeadDetailScreen />);
    fireEvent.press(await screen.findByTestId('user-lead-delete'));
    await act(async () => fireEvent.press(screen.getByTestId('user-lead-delete-dialog-confirm')));
    expect(callsTo(docs.CrmAppDeleteUserLeadDocument)[0]?.[1]).toEqual({ id: 'u1' });
    expect(mockNav.goBack).toHaveBeenCalled();
  });

  it('says so when the lead is gone, and shows a failed delete in the dialog', async () => {
    serve(new Map([[docs.CrmAppUserLeadDocument, () => ({ waUserLead: null })]]));
    const { unmount } = renderWithTheme(<UserLeadDetailScreen />);
    expect(await screen.findByText('This lead was not found.')).toBeOnTheScreen();
    unmount();
    serve(
      new Map([
        [
          docs.CrmAppDeleteUserLeadDocument,
          () => {
            throw new Error('offline');
          },
        ],
      ]),
    );
    renderWithTheme(<UserLeadDetailScreen />);
    fireEvent.press(await screen.findByTestId('user-lead-delete'));
    await act(async () => fireEvent.press(screen.getByTestId('user-lead-delete-dialog-confirm')));
    expect(screen.getByTestId('user-lead-delete-dialog-error')).toHaveTextContent('offline');
    expect(mockNav.goBack).not.toHaveBeenCalled();
  });
});

describe('UserLeadEditorScreen', () => {
  it('adds a lead by hand, refusing a number without digits first', async () => {
    serve(
      new Map([[docs.CrmAppCreateUserLeadDocument, () => ({ waCreateUserLead: { id: 'u9' } })]]),
    );
    renderWithTheme(<UserLeadEditorScreen />);
    expect(mockNav.setOptions).toHaveBeenCalledWith({ title: 'New user lead' });
    fireEvent.changeText(screen.getByTestId('user-lead-phone'), '+');
    fireEvent.press(screen.getByTestId('user-lead-save'));
    expect(await screen.findByText('Enter a phone number with its country code')).toBeOnTheScreen();
    fireEvent.changeText(screen.getByTestId('user-lead-phone'), ' 919811000002 ');
    await act(async () => fireEvent.press(screen.getByTestId('user-lead-save')));
    expect(callsTo(docs.CrmAppCreateUserLeadDocument)[0]?.[1]).toEqual({
      input: { phone: '919811000002', name: null },
    });
    expect(mockNav.goBack).toHaveBeenCalled();
  });

  it('edits a lead it loaded, and shows the server’s refusal', async () => {
    mockParams = { id: 'u1' };
    serve(
      new Map([
        [
          docs.CrmAppUpdateUserLeadDocument,
          () => {
            throw new Error('That number is already a lead');
          },
        ],
      ]),
    );
    renderWithTheme(<UserLeadEditorScreen />);
    expect(await screen.findByDisplayValue('Asha')).toBeOnTheScreen();
    fireEvent.changeText(screen.getByTestId('user-lead-name'), 'Asha Rao');
    await act(async () => fireEvent.press(screen.getByTestId('user-lead-save')));
    expect(callsTo(docs.CrmAppUpdateUserLeadDocument)[0]?.[1]).toEqual({
      id: 'u1',
      input: { phone: '919811000001', name: 'Asha Rao' },
    });
    expect(screen.getByTestId('user-lead-save-error')).toHaveTextContent(
      'That number is already a lead',
    );
    expect(mockNav.goBack).not.toHaveBeenCalled();
  });
});
