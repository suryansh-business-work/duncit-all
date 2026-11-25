import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';

import { useWaExtraction } from '@/features/whatsapp-generator/extractionStore';
import * as docs from '@/graphql/whatsappGenerator';
import { gqlRequest } from '@/services/graphql.client';
import { renderWithTheme } from '@/test-utils';
import { WhatsAppGeneratorScreen } from '../whatsapp-generator/WhatsAppGeneratorScreen';

jest.mock('crm-telephony', () => ({ CrmTelephony: null }));
jest.mock('@/services/graphql.client', () => ({ gqlRequest: jest.fn() }));
const mockNav = { navigate: jest.fn(), goBack: jest.fn(), setOptions: jest.fn() };
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNav,
  useRoute: () => ({ params: {} }),
  useFocusEffect: (fn: () => void) =>
    jest.requireActual<typeof import('react')>('react').useEffect(fn, [fn]),
}));

/** The connected account's browser: Communities → Groups → Members, and Users. */

const request = gqlRequest as jest.Mock;
const CONNECTED = {
  base_url: 'https://open-wa-server.duncit.com',
  has_api_key: true,
  status: 'CONNECTED',
  phone: '919812345678',
  last_error: null,
  connected_at: '2026-11-20T10:00:00.000Z',
};
const COMMUNITY = { id: 'c1', community_jid: 'c1@g.us', name: 'Mumbai Foodies', groups_count: 4 };
const GROUP = { id: 'g1', group_jid: 'g1@g.us', name: 'Bandra Brunch Club' };
const MEMBERS = [
  { jid: 'm1', phone: '919000000011', name: 'Asha Rao', is_business: false },
  { jid: 'm2', phone: '919000000012', name: '', is_business: true },
];
type Input = { search: string | null; page: number; community_jid?: string };
type Handler = (vars: Record<string, unknown>) => unknown;
const serve = (overrides: Map<unknown, Handler> = new Map()) =>
  request.mockImplementation(async (doc: unknown, vars: Record<string, unknown> = {}) => {
    const handler = overrides.get(doc);
    if (handler) return handler(vars);
    const input = vars.input as Input | undefined;
    if (doc === docs.CrmAppWhatsappConnectionDocument) return { waConnection: CONNECTED };
    if (doc === docs.CrmAppWhatsappStatusDocument) return { waStatus: { status: 'CONNECTED' } };
    if (doc === docs.CrmAppWhatsappExtractionDocument) return { waExtraction: null };
    if (doc === docs.CrmAppWhatsappCommunitiesDocument)
      return { waCommunities: { total: 1, items: [COMMUNITY] } };
    if (doc === docs.CrmAppWhatsappGroupsDocument)
      return input?.community_jid
        ? { waGroups: { total: 1, items: [GROUP] } }
        : { waGroups: { total: 0, items: [] } };
    if (doc === docs.CrmAppWhatsappGroupMembersDocument) return { waGroupMembers: MEMBERS };
    throw new Error('unexpected operation');
  });
const callsTo = (doc: unknown) => request.mock.calls.filter(([d]) => d === doc);
const lastInput = (doc: unknown) => callsTo(doc).at(-1)?.[1].input as Input;
const press = (id: string) => act(async () => fireEvent.press(screen.getByTestId(id)));

beforeEach(() => {
  jest.clearAllMocks();
  serve();
});

afterEach(() => {
  useWaExtraction.getState().stop();
});

describe('WhatsApp Lead Generator — browser', () => {
  it('drills from a community into its groups, and a group into its members', async () => {
    renderWithTheme(<WhatsAppGeneratorScreen />);
    expect(await screen.findByText('Mumbai Foodies')).toBeOnTheScreen();
    expect(screen.getByText('4 groups')).toBeOnTheScreen();
    expect(screen.getByText('1 result')).toBeOnTheScreen();
    await press('wa-row-c1');
    expect(await screen.findByText('Bandra Brunch Club')).toBeOnTheScreen();
    expect(lastInput(docs.CrmAppWhatsappGroupsDocument)).toMatchObject({
      community_jid: 'c1@g.us',
    });
    expect(screen.getByText('Community: Mumbai Foodies')).toBeOnTheScreen();
    expect(screen.getByText('Tap to view members')).toBeOnTheScreen();

    await press('wa-row-g1');
    expect(await screen.findByText('Asha Rao')).toBeOnTheScreen();
    expect(callsTo(docs.CrmAppWhatsappGroupMembersDocument)[0]?.[1]).toEqual({
      group_jid: 'g1@g.us',
    });
    expect(screen.getByText('+919000000012')).toBeOnTheScreen();
    expect(screen.getByText('+919000000012 · Business')).toBeOnTheScreen();
    await press('wa-members-leads');
    expect(mockNav.navigate).toHaveBeenCalledWith('UserLeads');
    expect(screen.queryByTestId('wa-members-sheet')).toBeNull();

    // Clearing the community widens the list back to every group.
    await press('wa-community-clear');
    expect(
      await screen.findByText('No data yet. Tap Extract to pull from WhatsApp.'),
    ).toBeOnTheScreen();
    expect(screen.queryByText('Community: Mumbai Foodies')).toBeNull();
  });

  it('says when a group has no members, or why they could not be read, and closes', async () => {
    serve(
      new Map<unknown, Handler>([
        [docs.CrmAppWhatsappGroupMembersDocument, () => ({ waGroupMembers: [] })],
      ]),
    );
    renderWithTheme(<WhatsAppGeneratorScreen />);
    await screen.findByTestId('wa-row-c1');
    await press('wa-row-c1');
    await screen.findByTestId('wa-row-g1');
    await press('wa-row-g1');
    expect(await screen.findByText('No members found.')).toBeOnTheScreen();
    // The group's name heads the sheet, over the row it was opened from.
    expect(screen.getAllByText('Bandra Brunch Club')).toHaveLength(2);
    await press('wa-members-close');
    expect(screen.queryByTestId('wa-members-sheet')).toBeNull();

    serve(
      new Map<unknown, Handler>([
        [
          docs.CrmAppWhatsappGroupMembersDocument,
          () => Promise.reject(new Error('Group not found')),
        ],
      ]),
    );
    await press('wa-row-g1');
    expect(await screen.findByText('Group not found')).toBeOnTheScreen();
  });

  it('lists users by name, falling back to the number, and flags business accounts', async () => {
    serve(
      new Map<unknown, Handler>([
        [
          docs.CrmAppWhatsappContactsDocument,
          () => ({
            waContacts: {
              total: 2,
              items: [
                { id: 'u1', phone: '919000000001', name: 'Ravi Kumar', is_business: true },
                { id: 'u2', phone: '919000000002', name: '', is_business: false },
              ],
            },
          }),
        ],
      ]),
    );
    renderWithTheme(<WhatsAppGeneratorScreen />);
    await screen.findByText('Mumbai Foodies');
    await press('wa-tab-users');
    expect(await screen.findByText('Ravi Kumar')).toBeOnTheScreen();
    expect(screen.getByText('+919000000001 · Business')).toBeOnTheScreen();
    expect(screen.getAllByText('+919000000002')).toHaveLength(2);
    expect(screen.getByText('2 results')).toBeOnTheScreen();
  });

  it('searches on the server once typing settles, and reads the next page at the end', async () => {
    serve(
      new Map<unknown, Handler>([
        [
          docs.CrmAppWhatsappCommunitiesDocument,
          (vars) => {
            const input = vars.input as Input;
            if (input.page === 2)
              return {
                waCommunities: {
                  total: 2,
                  items: [{ ...COMMUNITY, id: 'c2', name: 'Pune Readers' }],
                },
              };
            return {
              waCommunities: { total: 2, items: [{ ...COMMUNITY, name: input.search ?? 'All' }] },
            };
          },
        ],
      ]),
    );
    renderWithTheme(<WhatsAppGeneratorScreen />);
    await screen.findByText('All');
    fireEvent.changeText(screen.getByTestId('wa-search'), '  pune ');
    expect(await screen.findByText('pune')).toBeOnTheScreen();
    expect(lastInput(docs.CrmAppWhatsappCommunitiesDocument)).toMatchObject({
      search: 'pune',
      page: 1,
    });
    await act(async () => fireEvent(screen.getByTestId('wa-browser-list'), 'onEndReached'));
    expect(await screen.findByText('Pune Readers')).toBeOnTheScreen();
    await waitFor(() =>
      expect(lastInput(docs.CrmAppWhatsappCommunitiesDocument)).toMatchObject({ page: 2 }),
    );
  });
});
