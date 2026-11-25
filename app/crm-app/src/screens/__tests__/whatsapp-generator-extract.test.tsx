import { act, fireEvent, screen } from '@testing-library/react-native';

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

/** Extract from the browser: start a job, see it run, and the list refresh once it finishes. */

const request = gqlRequest as jest.Mock;
const CONNECTED = {
  base_url: 'https://open-wa-server.duncit.com',
  has_api_key: true,
  status: 'CONNECTED',
  phone: '919812345678',
  last_error: null,
  connected_at: '2026-11-20T10:00:00.000Z',
};
const job = (status: string) => ({
  id: 'job-1',
  status,
  total: 0,
  processed: 0,
  valid: 0,
  invalid: 0,
  duplicates: 0,
  communities: 0,
  groups: 0,
  leads_created: 0,
  error: null,
});
let current: ReturnType<typeof job> | null = null;
let communities: { id: string; community_jid: string; name: string; groups_count: number }[] = [];
type Handler = () => unknown;
const serve = (overrides: Map<unknown, Handler> = new Map()) =>
  request.mockImplementation(async (doc: unknown) => {
    const handler = overrides.get(doc);
    if (handler) return handler();
    if (doc === docs.CrmAppWhatsappConnectionDocument) return { waConnection: CONNECTED };
    if (doc === docs.CrmAppWhatsappStatusDocument) return { waStatus: { status: 'CONNECTED' } };
    if (doc === docs.CrmAppWhatsappExtractionDocument) return { waExtraction: current };
    if (doc === docs.CrmAppWhatsappCommunitiesDocument)
      return { waCommunities: { total: communities.length, items: communities } };
    if (doc === docs.CrmAppWhatsappStartExtractionDocument) {
      current = job('RUNNING');
      return { waStartExtraction: { id: 'job-1' } };
    }
    throw new Error('unexpected operation');
  });
const callsTo = (doc: unknown) => request.mock.calls.filter(([d]) => d === doc);

beforeEach(() => {
  jest.clearAllMocks();
  current = null;
  communities = [];
  serve();
});

afterEach(() => {
  useWaExtraction.getState().stop();
});

describe('WhatsApp Lead Generator — Extract', () => {
  it('starts an extraction, shows it running, and refreshes the list once it finishes', async () => {
    renderWithTheme(<WhatsAppGeneratorScreen />);
    expect(
      await screen.findByText('No data yet. Tap Extract to pull from WhatsApp.'),
    ).toBeOnTheScreen();
    expect(screen.getByText('Extract')).toBeOnTheScreen();

    await act(async () => fireEvent.press(screen.getByTestId('wa-extract')));
    expect(callsTo(docs.CrmAppWhatsappStartExtractionDocument)).toHaveLength(1);
    expect(await screen.findByText('Extracting…')).toBeOnTheScreen();
    expect(screen.getByTestId('wa-extract')).toBeDisabled();
    expect(
      screen.getByText('Extraction in progress — data updates automatically.'),
    ).toBeOnTheScreen();
    expect(screen.getByText('Extracting from WhatsApp…')).toBeOnTheScreen();
    expect(useWaExtraction.getState().open).toBe(true);

    current = { ...job('DONE'), processed: 3, leads_created: 3 };
    communities = [{ id: 'c1', community_jid: 'c1@g.us', name: 'Mumbai Foodies', groups_count: 4 }];
    const reads = callsTo(docs.CrmAppWhatsappCommunitiesDocument).length;
    await act(() => useWaExtraction.getState().load());
    expect(await screen.findByText('Mumbai Foodies')).toBeOnTheScreen();
    expect(callsTo(docs.CrmAppWhatsappCommunitiesDocument)).toHaveLength(reads + 1);
    expect(screen.getByText('Extract')).toBeOnTheScreen();

    // The same finished job read again does not refresh the list a second time.
    await act(() => useWaExtraction.getState().load());
    expect(callsTo(docs.CrmAppWhatsappCommunitiesDocument)).toHaveLength(reads + 1);
  });

  it('shows why an extraction could not start', async () => {
    serve(
      new Map<unknown, Handler>([
        [
          docs.CrmAppWhatsappStartExtractionDocument,
          () => Promise.reject(new Error('Session not connected')),
        ],
      ]),
    );
    renderWithTheme(<WhatsAppGeneratorScreen />);
    await screen.findByTestId('wa-extract');
    await act(async () => fireEvent.press(screen.getByTestId('wa-extract')));
    expect(await screen.findByText('Session not connected')).toBeOnTheScreen();
    expect(screen.queryByTestId('wa-extract-running')).toBeNull();
  });

  it('shows why a list could not be read, and reads it and the job again', async () => {
    serve(
      new Map<unknown, Handler>([
        [
          docs.CrmAppWhatsappCommunitiesDocument,
          () => Promise.reject(new Error('Cache unavailable')),
        ],
      ]),
    );
    renderWithTheme(<WhatsAppGeneratorScreen />);
    expect(await screen.findByText('Cache unavailable')).toBeOnTheScreen();
    communities = [{ id: 'c1', community_jid: 'c1@g.us', name: 'Mumbai Foodies', groups_count: 4 }];
    serve();
    await act(async () => fireEvent.press(screen.getByTestId('state-retry')));
    expect(await screen.findByText('Mumbai Foodies')).toBeOnTheScreen();
    expect(callsTo(docs.CrmAppWhatsappExtractionDocument).length).toBeGreaterThan(1);
  });
});
