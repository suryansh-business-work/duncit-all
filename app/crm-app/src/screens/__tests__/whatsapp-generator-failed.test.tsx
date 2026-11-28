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

/**
 * A session the gateway reports as failed: the screen opens on Link WhatsApp, says why (or what
 * to do when the gateway lost the reason) and offers Restart connection. Never linked, so nothing
 * restarts by itself.
 */

const request = gqlRequest as jest.Mock;
const NO_REASON =
  'WhatsApp stopped after an earlier error and is not running now. Press Restart connection, then scan the new QR.';
const failed = (lastError: string | null) => ({
  base_url: 'https://open-wa-server.duncit.com',
  has_api_key: true,
  status: 'ERROR',
  phone: '918791234693',
  last_error: lastError,
  connected_at: null,
});
let connection = failed(null);
const serve = () =>
  request.mockImplementation(async (doc: unknown) => {
    if (doc === docs.CrmAppWhatsappConnectionDocument) return { waConnection: connection };
    if (doc === docs.CrmAppWhatsappStatusDocument)
      return { waStatus: { status: connection.status } };
    if (doc === docs.CrmAppWhatsappQrDocument) return { waQr: { qr_code: null } };
    if (doc === docs.CrmAppWhatsappExtractionDocument) return { waExtraction: null };
    if (doc === docs.CrmAppWhatsappConnectDocument) {
      connection = { ...connection, status: 'CONNECTING', last_error: null };
      return { waConnect: { status: 'CONNECTING' } };
    }
    throw new Error('unexpected operation');
  });
const connectCalls = () =>
  request.mock.calls.filter(([d]) => d === docs.CrmAppWhatsappConnectDocument);
const press = (id: string) => act(async () => fireEvent.press(screen.getByTestId(id)));

beforeEach(() => {
  jest.clearAllMocks();
  connection = failed(null);
  serve();
});

afterEach(() => {
  useWaExtraction.getState().stop();
});

describe('WhatsAppGeneratorScreen — a failed session', () => {
  it('opens on Link WhatsApp and says what to do when the gateway gave no reason', async () => {
    renderWithTheme(<WhatsAppGeneratorScreen />);
    expect(await screen.findByText(NO_REASON)).toBeOnTheScreen();
    expect(screen.getByText('Error')).toBeOnTheScreen();
    expect(screen.getByText('Restart connection')).toBeOnTheScreen();
    expect(screen.queryByTestId('wa-gateway-submit')).toBeNull();
    // Never linked, so it waits for the person rather than restarting by itself.
    expect(connectCalls()).toHaveLength(0);
  });

  it('restarts the session when Restart connection is pressed', async () => {
    renderWithTheme(<WhatsAppGeneratorScreen />);
    await screen.findByText(NO_REASON);
    await press('wa-connect');
    expect(connectCalls()[0]?.[1]).toEqual({ restart: true });
    expect(await screen.findByText('Waiting for QR…')).toBeOnTheScreen();
    expect(screen.queryByText(NO_REASON)).toBeNull();
  });

  it('shows the reason the gateway gave instead of the general advice', async () => {
    connection = failed('Failed to launch the browser process');
    renderWithTheme(<WhatsAppGeneratorScreen />);
    expect(await screen.findByText('Failed to launch the browser process')).toBeOnTheScreen();
    expect(screen.queryByText(NO_REASON)).toBeNull();
  });

  it('still goes back to the Gateway step to change the URL or key', async () => {
    renderWithTheme(<WhatsAppGeneratorScreen />);
    await screen.findByText(NO_REASON);
    await press('wa-back');
    expect(await screen.findByTestId('wa-gateway-submit')).toBeOnTheScreen();
  });
});
