import { act, screen } from '@testing-library/react-native';
import { WA_MAX_ERROR_RESTARTS, WA_POLL_MS, WA_STUCK_RESTART_MS } from '@duncit/utils';

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

/** Link WhatsApp over time: polling a booting session, its automatic restarts and their limits. */

const request = gqlRequest as jest.Mock;
const BOOTING = {
  base_url: 'https://open-wa-server.duncit.com',
  has_api_key: true,
  status: 'CONNECTING',
  phone: null,
  last_error: null,
  connected_at: null,
};

/** Serves a booting session whose live status answers each read in turn (the last one repeats). */
const serve = (statuses: string[], qr: string | null = null) => {
  let read = 0;
  request.mockImplementation(async (doc: unknown) => {
    if (doc === docs.CrmAppWhatsappConnectionDocument) return { waConnection: BOOTING };
    if (doc === docs.CrmAppWhatsappStatusDocument) {
      const status = statuses[Math.min(read, statuses.length - 1)];
      read += 1;
      return { waStatus: { status } };
    }
    if (doc === docs.CrmAppWhatsappQrDocument) return { waQr: { qr_code: qr } };
    if (doc === docs.CrmAppWhatsappExtractionDocument) return { waExtraction: null };
    if (doc === docs.CrmAppWhatsappConnectDocument) return { waConnect: { status: 'CONNECTING' } };
    throw new Error('unexpected operation');
  });
};
const restarts = () =>
  request.mock.calls.filter(
    ([d, vars]) => d === docs.CrmAppWhatsappConnectDocument && vars?.restart === true,
  ).length;

// One poll interval per act, so each read's answer lands before the next tick.
const advance = async (ms: number) => {
  for (let elapsed = 0; elapsed < ms; elapsed += WA_POLL_MS) {
    await act(async () => {
      jest.advanceTimersByTime(Math.min(WA_POLL_MS, ms - elapsed));
    });
  }
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
});

afterEach(() => {
  useWaExtraction.getState().stop();
  jest.useRealTimers();
});

describe('WhatsAppGeneratorScreen — a booting session over time', () => {
  it('reads the live status and QR every few seconds while it boots', async () => {
    serve(['CONNECTING'], 'data:image/png;base64,UVI=');
    renderWithTheme(<WhatsAppGeneratorScreen />);
    expect(await screen.findByTestId('wa-qr')).toBeOnTheScreen();
    const reads = request.mock.calls.filter(([d]) => d === docs.CrmAppWhatsappQrDocument).length;
    await advance(WA_POLL_MS * 2);
    expect(request.mock.calls.filter(([d]) => d === docs.CrmAppWhatsappQrDocument).length).toBe(
      reads + 2,
    );
  });

  it('restarts a booting session that fails while the screen is open', async () => {
    serve(['CONNECTING', 'ERROR']);
    renderWithTheme(<WhatsAppGeneratorScreen />);
    await screen.findByText('Waiting for QR…');
    await advance(WA_POLL_MS * 2);
    expect(restarts()).toBe(1);
  });

  it(`gives up after ${WA_MAX_ERROR_RESTARTS} automatic restarts`, async () => {
    serve([
      'CONNECTING',
      'ERROR',
      'CONNECTING',
      'ERROR',
      'CONNECTING',
      'ERROR',
      'CONNECTING',
      'ERROR',
    ]);
    renderWithTheme(<WhatsAppGeneratorScreen />);
    await screen.findByText('Waiting for QR…');
    await advance(WA_POLL_MS * 10);
    expect(restarts()).toBe(WA_MAX_ERROR_RESTARTS);
  });

  it('restarts once by itself when no QR arrives in time', async () => {
    serve(['CONNECTING']);
    renderWithTheme(<WhatsAppGeneratorScreen />);
    await screen.findByText('Waiting for QR…');
    await advance(WA_STUCK_RESTART_MS - 1000);
    expect(restarts()).toBe(0);
    await advance(2000);
    expect(restarts()).toBe(1);
    await advance(WA_STUCK_RESTART_MS + WA_POLL_MS);
    expect(restarts()).toBe(1);
  });

  it('keeps polling through a failed status read', async () => {
    let fail = true;
    serve(['CONNECTING']);
    const served = request.getMockImplementation();
    request.mockImplementation(async (doc: unknown, vars: unknown) => {
      if (doc === docs.CrmAppWhatsappStatusDocument && fail) {
        fail = false;
        throw new Error('Gateway timeout');
      }
      return served?.(doc, vars);
    });
    renderWithTheme(<WhatsAppGeneratorScreen />);
    await screen.findByText('Waiting for QR…');
    await advance(WA_POLL_MS);
    expect(request.mock.calls.filter(([d]) => d === docs.CrmAppWhatsappStatusDocument).length).toBe(
      2,
    );
  });
});
