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

/** CRM › Tools › WhatsApp Lead Generator: Link WhatsApp (Connect, QR, resume) and the linked account. */

const request = gqlRequest as jest.Mock;
const LINKED_AT = '2026-11-20T10:00:00.000Z';
const QR = 'data:image/png;base64,UVI=';
const conn = (o: Record<string, unknown> = {}) => ({
  base_url: 'https://open-wa-server.duncit.com',
  has_api_key: true,
  status: 'DISCONNECTED',
  phone: null,
  last_error: null,
  connected_at: null,
  ...o,
});
let connection = conn();
type Handler = (vars: Record<string, unknown>) => unknown;
const serve = (overrides: Map<unknown, Handler> = new Map()) =>
  request.mockImplementation(async (doc: unknown, vars: Record<string, unknown> = {}) => {
    const handler = overrides.get(doc);
    if (handler) return handler(vars);
    if (doc === docs.CrmAppWhatsappConnectionDocument) return { waConnection: connection };
    if (doc === docs.CrmAppWhatsappStatusDocument)
      return { waStatus: { status: connection.status } };
    if (doc === docs.CrmAppWhatsappQrDocument) return { waQr: { qr_code: QR } };
    if (doc === docs.CrmAppWhatsappExtractionDocument) return { waExtraction: null };
    if (doc === docs.CrmAppWhatsappSaveConfigDocument)
      return { waSaveConfig: { status: 'DISCONNECTED' } };
    if (doc === docs.CrmAppWhatsappConnectDocument) {
      connection = conn({ status: 'CONNECTING' });
      return { waConnect: { status: 'CONNECTING' } };
    }
    if (doc === docs.CrmAppWhatsappDisconnectDocument) {
      connection = conn();
      return { waDisconnect: { status: 'DISCONNECTED' } };
    }
    if (doc === docs.CrmAppWhatsappCommunitiesDocument)
      return { waCommunities: { total: 0, items: [] } };
    throw new Error('unexpected operation');
  });
const callsTo = (doc: unknown) => request.mock.calls.filter(([d]) => d === doc);
const press = (id: string) => act(async () => fireEvent.press(screen.getByTestId(id)));
const toLinkStep = async () => {
  renderWithTheme(<WhatsAppGeneratorScreen />);
  await screen.findByTestId('wa-gateway-submit');
  await press('wa-gateway-submit');
  await screen.findByTestId('wa-connect');
};

beforeEach(() => {
  jest.clearAllMocks();
  connection = conn();
  serve();
});

afterEach(() => {
  useWaExtraction.getState().stop();
});

describe('WhatsAppGeneratorScreen — Link WhatsApp', () => {
  it('starts the session only when Connect is pressed, then shows the QR to scan', async () => {
    await toLinkStep();
    expect(screen.getByText('Connect')).toBeOnTheScreen();
    expect(callsTo(docs.CrmAppWhatsappConnectDocument)).toHaveLength(0);
    await press('wa-connect');
    expect(callsTo(docs.CrmAppWhatsappConnectDocument)[0]?.[1]).toEqual({ restart: false });
    const qr = await screen.findByTestId('wa-qr');
    expect(qr.props.source).toEqual({ uri: QR });
    expect(qr.props.accessibilityLabel).toBe('WhatsApp QR');
    expect(
      screen.getByText('Open WhatsApp → Linked devices → Link a device, then scan:'),
    ).toBeOnTheScreen();
    expect(screen.getByText('Connecting')).toBeOnTheScreen();
    expect(screen.getByText('Restart connection')).toBeOnTheScreen();
    expect(screen.getByText(/It restarts by itself/)).toBeOnTheScreen();
    expect(screen.queryByText(/Press Connect to start WhatsApp/)).toBeNull();
  });

  it('shows why a start failed, and goes back to the Gateway step', async () => {
    serve(
      new Map<unknown, Handler>([
        [
          docs.CrmAppWhatsappConnectDocument,
          () => Promise.reject(new Error('Gateway refused the session')),
        ],
      ]),
    );
    await toLinkStep();
    await press('wa-connect');
    expect(await screen.findByText('Gateway refused the session')).toBeOnTheScreen();
    await press('wa-back');
    expect(await screen.findByTestId('wa-gateway-submit')).toBeOnTheScreen();
  });

  it('goes back from the first step tab, but reaches Link WhatsApp only through Save & continue', async () => {
    await toLinkStep();
    await press('wa-step-gateway');
    expect(await screen.findByTestId('wa-gateway-submit')).toBeOnTheScreen();
    await press('wa-step-link');
    expect(screen.getByTestId('wa-gateway-submit')).toBeOnTheScreen();
    expect(screen.queryByTestId('wa-connect')).toBeNull();
  });

  it('opens a booting session on Link WhatsApp, waiting for its QR, and restarts it by hand', async () => {
    connection = conn({ status: 'CONNECTING' });
    serve(
      new Map<unknown, Handler>([
        [docs.CrmAppWhatsappQrDocument, () => ({ waQr: { qr_code: null } })],
      ]),
    );
    renderWithTheme(<WhatsAppGeneratorScreen />);
    expect(await screen.findByText('Waiting for QR…')).toBeOnTheScreen();
    expect(screen.queryByTestId('wa-gateway-submit')).toBeNull();
    expect(callsTo(docs.CrmAppWhatsappConnectDocument)).toHaveLength(0);
    await press('wa-connect');
    expect(callsTo(docs.CrmAppWhatsappConnectDocument)[0]?.[1]).toEqual({ restart: true });
  });

  it('says it is reconnecting a saved session, which it resumes by itself', async () => {
    connection = conn({ connected_at: LINKED_AT });
    serve(
      new Map<unknown, Handler>([
        [docs.CrmAppWhatsappConnectDocument, () => new Promise(() => undefined)],
      ]),
    );
    renderWithTheme(<WhatsAppGeneratorScreen />);
    expect(await screen.findByText('Reconnecting your saved WhatsApp session…')).toBeOnTheScreen();
    expect(callsTo(docs.CrmAppWhatsappConnectDocument)[0]?.[1]).toEqual({ restart: false });
    expect(screen.getByTestId('wa-connect')).toBeDisabled();
    // Not while the session is starting.
    await press('wa-step-gateway');
    expect(screen.queryByTestId('wa-gateway-submit')).toBeNull();
  });

  it('restarts a linked session whose engine failed, showing the last error', async () => {
    connection = conn({ status: 'ERROR', connected_at: LINKED_AT, last_error: 'auth timeout' });
    serve(
      new Map<unknown, Handler>([
        [docs.CrmAppWhatsappConnectDocument, () => new Promise(() => undefined)],
      ]),
    );
    renderWithTheme(<WhatsAppGeneratorScreen />);
    expect(await screen.findByText('auth timeout')).toBeOnTheScreen();
    expect(screen.getByText('Error')).toBeOnTheScreen();
    await waitFor(() =>
      expect(callsTo(docs.CrmAppWhatsappConnectDocument)[0]?.[1]).toEqual({ restart: true }),
    );
  });
});

describe('WhatsAppGeneratorScreen — linked account', () => {
  it('names the linked number, opens the lead tools, and disconnects back to Link WhatsApp', async () => {
    connection = conn({ status: 'CONNECTED', phone: '919812345678', connected_at: LINKED_AT });
    renderWithTheme(<WhatsAppGeneratorScreen />);
    expect(await screen.findByText('+919812345678')).toBeOnTheScreen();
    expect(
      screen.getByText('Session saved. It stays linked when you leave this page.'),
    ).toBeOnTheScreen();
    expect(screen.getByTestId('wa-tab-communities')).toBeOnTheScreen();
    expect(screen.queryByTestId('wa-gateway-submit')).toBeNull();
    await press('wa-disconnect');
    expect(callsTo(docs.CrmAppWhatsappDisconnectDocument)).toHaveLength(1);
    expect(await screen.findByText(/Press Connect to start WhatsApp/)).toBeOnTheScreen();
    expect(screen.queryByTestId('wa-tab-communities')).toBeNull();
  });

  it('describes an account whose number the gateway did not report, and a refused disconnect', async () => {
    connection = conn({ status: 'CONNECTED' });
    serve(
      new Map<unknown, Handler>([
        [docs.CrmAppWhatsappDisconnectDocument, () => Promise.reject(new Error('Gateway offline'))],
      ]),
    );
    renderWithTheme(<WhatsAppGeneratorScreen />);
    expect(await screen.findByText('WhatsApp account linked')).toBeOnTheScreen();
    await press('wa-disconnect');
    expect(await screen.findByText('Gateway offline')).toBeOnTheScreen();
    expect(screen.getByTestId('wa-connected')).toBeOnTheScreen();
  });
});
