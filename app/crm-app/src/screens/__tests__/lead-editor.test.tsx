import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';

import * as docs from '@/graphql/leadEditor';
import { gqlRequest } from '@/services/graphql.client';
import { renderWithTheme } from '@/test-utils';
import { LeadEditorScreen } from '../lead/LeadEditorScreen';
import { NewLeadPicker } from '../leads/NewLeadPicker';

jest.mock('crm-telephony', () => ({ CrmTelephony: null }));
jest.mock('@/services/graphql.client', () => ({ gqlRequest: jest.fn() }));
const mockNav = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  dispatch: jest.fn(),
  setOptions: jest.fn(),
};
let mockRouteParams: Record<string, unknown> = {};
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNav,
  useRoute: () => ({ params: mockRouteParams }),
  StackActions: {
    replace: (name: string, params: unknown) => ({ type: 'REPLACE', payload: { name, params } }),
  },
}));

const request = gqlRequest as jest.Mock;

const OPTIONS = {
  crmLeadConfig: {
    venue_types: ['Cafe', 'Other'],
    venue_lead_statuses: ['New', 'Contacted'],
    host_lead_statuses: ['New', 'Onboarded'],
    priorities: ['Low', 'Medium', 'High'],
  },
  categories: [
    { id: 'c1', name: 'Pets', is_active: true },
    { id: 'c2', name: 'Retired', is_active: false },
  ],
};
const USERS = { crmAssignableUsers: [{ id: 'u1', name: 'Asha' }] };
const HOST = {
  id: 'h1',
  host_name: 'Run Club',
  super_category_id: 'c1',
  city: 'Pune',
  area: '',
  website: '',
  lead_status: 'New',
  priority: 'High',
  assigned_user_id: null,
  assigned_to: '',
  next_follow_up_date: null,
  preferred_event_date: '2026-12-24T00:00:00.000Z',
  community_size: 120,
  past_attendees: null,
  instagram_link: '',
  community_link: '',
  notes: 'Met at the park',
  contacts: [
    { name: 'Rohit', role: 'Founder', mobile_number: '9811000001', whatsapp_number: '', email: '' },
  ],
  services_offered: [],
};

type Handler = (vars: Record<string, unknown>) => unknown;

/** Answers each operation by its document, as the API would. */
function serve(overrides: Map<unknown, Handler> = new Map()) {
  request.mockImplementation(async (doc: unknown, vars: Record<string, unknown>) => {
    const handler = overrides.get(doc);
    if (handler) return handler(vars);
    if (doc === docs.CrmAppLeadOptionsDocument) return OPTIONS;
    if (doc === docs.CrmAppAssignableUsersDocument) return USERS;
    if (doc === docs.CrmAppLeadEditDocument) return { host: HOST };
    if (doc === docs.CrmAppLeadDuplicatesDocument) return { crmLeadDuplicates: [] };
    throw new Error('unexpected operation');
  });
}

const callsTo = (doc: unknown) => request.mock.calls.filter(([d]) => d === doc);

beforeEach(() => {
  jest.clearAllMocks();
  mockRouteParams = { kind: 'ECOMM_LEAD' };
  serve();
});

describe('new lead', () => {
  it('names the screen after the kind and offers only active categories', async () => {
    renderWithTheme(<LeadEditorScreen />);
    expect(await screen.findByTestId('lead-super-category-c1')).toBeOnTheScreen();
    expect(screen.queryByTestId('lead-super-category-c2')).toBeNull();
    expect(mockNav.setOptions).toHaveBeenCalledWith({ title: 'New Ecomm lead' });
    expect(callsTo(docs.CrmAppLeadEditDocument)).toHaveLength(0);
  });

  it('blocks the save with the portal’s messages until the required fields are filled', async () => {
    renderWithTheme(<LeadEditorScreen />);
    fireEvent.press(await screen.findByTestId('lead-save'));
    expect(await screen.findByText('Seller name is required')).toBeOnTheScreen();
    expect(screen.getByText('Super category is required')).toBeOnTheScreen();
    expect(screen.getByTestId('lead-form-invalid')).toBeOnTheScreen();
    expect(callsTo(docs.CrmAppCreateEcommLeadDocument)).toHaveLength(0);
  });

  it('creates the lead with what was filled in, then opens its card in place of the editor', async () => {
    serve(
      new Map([[docs.CrmAppCreateEcommLeadDocument, () => ({ createEcommLead: { id: 'e9' } })]]),
    );
    renderWithTheme(<LeadEditorScreen />);
    fireEvent.press(await screen.findByTestId('lead-super-category-c1'));
    fireEvent.changeText(screen.getByTestId('lead-name'), ' Paws Co ');
    fireEvent.changeText(screen.getByTestId('lead-gst_number'), '27ABCDE1234F1Z5');
    fireEvent.press(screen.getByTestId('lead-assignee-u1'));
    fireEvent.press(screen.getByTestId('lead-priority-High'));
    fireEvent.press(screen.getByTestId('follow-up-3'));
    fireEvent.press(screen.getByTestId('lead-save'));

    await waitFor(() =>
      expect(mockNav.dispatch).toHaveBeenCalledWith({
        type: 'REPLACE',
        payload: { name: 'LeadDetail', params: { kind: 'ECOMM_LEAD', id: 'e9' } },
      }),
    );
    const [[, { input }]] = callsTo(docs.CrmAppCreateEcommLeadDocument);
    expect(input).toMatchObject({
      seller_name: 'Paws Co',
      super_category_id: 'c1',
      gst_number: '27ABCDE1234F1Z5',
      assigned_user_id: 'u1',
      assigned_to: 'Asha',
      priority: 'High',
      lead_status: 'New',
      contacts: [],
    });
    expect(typeof input.next_follow_up_date).toBe('string');
  });

  it('shows the server’s refusal and stays on the form', async () => {
    serve(
      new Map([
        [
          docs.CrmAppCreateEcommLeadDocument,
          () => {
            throw new Error('This phone number already belongs to another lead');
          },
        ],
      ]),
    );
    renderWithTheme(<LeadEditorScreen />);
    fireEvent.press(await screen.findByTestId('lead-super-category-c1'));
    fireEvent.changeText(screen.getByTestId('lead-name'), 'Paws Co');
    fireEvent.press(screen.getByTestId('lead-save'));
    expect(
      await screen.findByText('This phone number already belongs to another lead'),
    ).toBeOnTheScreen();
    expect(mockNav.dispatch).not.toHaveBeenCalled();
  });
});

describe('editing', () => {
  beforeEach(() => {
    mockRouteParams = { kind: 'HOST_LEAD', id: 'h1' };
  });

  it('loads the lead, saves only the changed card back, and returns to it', async () => {
    serve(new Map([[docs.CrmAppUpdateHostLeadDocument, () => ({ updateHostLead: { id: 'h1' } })]]));
    renderWithTheme(<LeadEditorScreen />);
    expect(await screen.findByDisplayValue('Run Club')).toBeOnTheScreen();
    expect(screen.getByDisplayValue('120')).toBeOnTheScreen();
    expect(callsTo(docs.CrmAppLeadEditDocument)[0][1]).toMatchObject({
      id: 'h1',
      host: true,
      venue: false,
    });
    expect(mockNav.setOptions).toHaveBeenCalledWith({ title: 'Edit lead' });

    fireEvent.press(screen.getByTestId('lead-status-Onboarded'));
    fireEvent.press(screen.getByTestId('lead-save'));
    await waitFor(() => expect(mockNav.goBack).toHaveBeenCalled());
    const [[, vars]] = callsTo(docs.CrmAppUpdateHostLeadDocument);
    expect(vars).toMatchObject({
      id: 'h1',
      input: {
        host_name: 'Run Club',
        lead_status: 'Onboarded',
        community_size: 120,
        preferred_event_date: '2026-12-24T00:00:00.000Z',
        notes: 'Met at the park',
      },
    });
  });

  it('says so when the lead is not there', async () => {
    serve(new Map([[docs.CrmAppLeadEditDocument, () => ({ host: null })]]));
    renderWithTheme(<LeadEditorScreen />);
    expect(await screen.findByText('This lead was not found.')).toBeOnTheScreen();
  });

  it('offers a retry when the lists could not be loaded', async () => {
    serve(
      new Map([
        [
          docs.CrmAppLeadOptionsDocument,
          () => {
            throw new Error('offline');
          },
        ],
      ]),
    );
    renderWithTheme(<LeadEditorScreen />);
    expect(await screen.findByText('offline')).toBeOnTheScreen();
    serve();
    fireEvent.press(screen.getByTestId('state-retry'));
    expect(await screen.findByDisplayValue('Run Club')).toBeOnTheScreen();
  });

  it('refuses a link with an unknown lead kind', () => {
    mockRouteParams = { kind: 'PLANET', id: 'x' };
    renderWithTheme(<LeadEditorScreen />);
    expect(screen.getByText('This lead was not found.')).toBeOnTheScreen();
  });
});

describe('duplicate check', () => {
  it('warns, once typing pauses, which lead already has the number', async () => {
    jest.useFakeTimers();
    try {
      serve(
        new Map([
          [
            docs.CrmAppLeadDuplicatesDocument,
            () => ({
              crmLeadDuplicates: [
                {
                  field: 'PHONE',
                  value: '9811000002',
                  entity_type: 'VENUE_LEAD',
                  lead_id: 'v1',
                  lead_name: 'Smash Arena',
                },
              ],
            }),
          ],
        ]),
      );
      renderWithTheme(<LeadEditorScreen />);
      fireEvent.changeText(await screen.findByTestId('contact-0-mobile'), '9811000002');
      expect(callsTo(docs.CrmAppLeadDuplicatesDocument)).toHaveLength(0);
      await act(async () => {
        jest.advanceTimersByTime(500);
      });
      expect(
        await screen.findByText('Phone number 9811000002 is already on Venue lead "Smash Arena"'),
      ).toBeOnTheScreen();
      expect(callsTo(docs.CrmAppLeadDuplicatesDocument)[0][1]).toEqual({
        input: {
          entity_type: 'ECOMM_LEAD',
          lead_id: null,
          contacts: [{ mobile_number: '9811000002', email: '' }],
          website: '',
        },
      });
    } finally {
      jest.useRealTimers();
    }
  });

  it('says the check could not run, without blocking the form', async () => {
    jest.useFakeTimers();
    try {
      serve(
        new Map([
          [
            docs.CrmAppLeadDuplicatesDocument,
            () => {
              throw new Error('offline');
            },
          ],
        ]),
      );
      renderWithTheme(<LeadEditorScreen />);
      fireEvent.changeText(await screen.findByTestId('contact-0-email'), 'mira@paws.in');
      await act(async () => {
        jest.advanceTimersByTime(500);
      });
      expect(await screen.findByTestId('lead-duplicates-failed')).toBeOnTheScreen();
    } finally {
      jest.useRealTimers();
    }
  });
});

describe('NewLeadPicker', () => {
  it('asks for the kind in a bottom sheet, then hands it on and closes', () => {
    const onPick = jest.fn();
    renderWithTheme(<NewLeadPicker onPick={onPick} />);
    expect(screen.queryByTestId('leads-new-kind-HOST_LEAD')).toBeNull();
    fireEvent.press(screen.getByTestId('leads-new'));
    fireEvent.press(screen.getByTestId('leads-new-kind-HOST_LEAD'));
    expect(onPick).toHaveBeenCalledWith('HOST_LEAD');
    expect(screen.queryByTestId('leads-new-kind-HOST_LEAD')).toBeNull();
  });

  it('closes without a kind on Cancel', () => {
    const onPick = jest.fn();
    renderWithTheme(<NewLeadPicker onPick={onPick} />);
    fireEvent.press(screen.getByTestId('leads-new'));
    fireEvent.press(screen.getByTestId('leads-new-kind-cancel'));
    expect(onPick).not.toHaveBeenCalled();
    expect(screen.queryByTestId('leads-new-kind-VENUE_LEAD')).toBeNull();
  });
});
