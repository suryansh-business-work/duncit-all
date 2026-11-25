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

/** CRM › Tools › WhatsApp Lead Generator: the gateway step (URL + API key typed in) and the screen. */

const request = gqlRequest as jest.Mock;
const conn = (o: Record<string, unknown> = {}) => ({
  base_url: 'https://open-wa-server.duncit.com',
  has_api_key: false,
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
    if (doc === docs.CrmAppWhatsappExtractionDocument) return { waExtraction: null };
    if (doc === docs.CrmAppWhatsappSaveConfigDocument)
      return { waSaveConfig: { status: 'DISCONNECTED' } };
    if (doc === docs.CrmAppWhatsappGenerateApiKeyDocument)
      return { waGenerateApiKey: { connection: { has_api_key: true } } };
    throw new Error('unexpected operation');
  });
const callsTo = (doc: unknown) => request.mock.calls.filter(([d]) => d === doc);
const submit = () => act(async () => fireEvent.press(screen.getByTestId('wa-gateway-submit')));

beforeEach(() => {
  jest.clearAllMocks();
  connection = conn();
  serve();
});

afterEach(() => {
  useWaExtraction.getState().stop();
});

describe('WhatsAppGeneratorScreen — gateway step', () => {
  it('opens a first connect on the Gateway step and starts nothing by itself', async () => {
    renderWithTheme(<WhatsAppGeneratorScreen />);
    expect(await screen.findByText('Gateway URL & API key')).toBeOnTheScreen();
    expect(mockNav.setOptions).toHaveBeenCalledWith({ title: 'WhatsApp Lead Generator' });
    expect(screen.getByText('Link WhatsApp')).toBeOnTheScreen();
    expect(screen.getByText('Disconnected')).toBeOnTheScreen();
    expect(screen.getByTestId('wa-gateway-url').props.value).toBe(connection.base_url);
    expect(screen.getByTestId('wa-gateway-key').props.placeholder).toBe('Paste the OpenWA API key');
    await waitFor(() => expect(callsTo(docs.CrmAppWhatsappStatusDocument)).toHaveLength(1));
    expect(callsTo(docs.CrmAppWhatsappConnectDocument)).toHaveLength(0);
    expect(screen.queryByTestId('wa-tab-communities')).toBeNull();
  });

  it('asks for a key until one is saved, and explains how to get one', async () => {
    renderWithTheme(<WhatsAppGeneratorScreen />);
    await screen.findByTestId('wa-gateway-submit');
    await submit();
    expect(screen.getByText('Enter the API key, or press Generate API key')).toBeOnTheScreen();
    expect(callsTo(docs.CrmAppWhatsappSaveConfigDocument)).toHaveLength(0);
    expect(screen.queryByTestId('wa-api-key-steps')).toBeNull();
    fireEvent.press(screen.getByTestId('wa-api-key-help'));
    expect(screen.getByText(/Easiest: press Generate API key/)).toBeOnTheScreen();
    expect(screen.getByText(/\/app\/data\/\.api-key/)).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('wa-api-key-help'));
    expect(screen.queryByTestId('wa-api-key-steps')).toBeNull();
  });

  it('saves the typed URL and key, then moves to Link WhatsApp without connecting', async () => {
    renderWithTheme(<WhatsAppGeneratorScreen />);
    fireEvent.changeText(await screen.findByTestId('wa-gateway-url'), 'https://wa.example.test');
    fireEvent.changeText(screen.getByTestId('wa-gateway-key'), '  own-key ');
    await submit();
    expect(callsTo(docs.CrmAppWhatsappSaveConfigDocument)[0]?.[1]).toEqual({
      input: { base_url: 'https://wa.example.test', api_key: 'own-key' },
    });
    expect(await screen.findByText(/Press Connect to start WhatsApp/)).toBeOnTheScreen();
    expect(screen.getByTestId('wa-connect')).toBeOnTheScreen();
    expect(callsTo(docs.CrmAppWhatsappConnectionDocument).length).toBeGreaterThan(1);
    expect(callsTo(docs.CrmAppWhatsappConnectDocument)).toHaveLength(0);
  });

  it('keeps a saved key when the field is left blank, and shows why the gateway refused it', async () => {
    connection = conn({ has_api_key: true });
    serve(
      new Map<unknown, Handler>([
        [
          docs.CrmAppWhatsappSaveConfigDocument,
          () => Promise.reject(new Error('The WhatsApp gateway refused this API key.')),
        ],
      ]),
    );
    renderWithTheme(<WhatsAppGeneratorScreen />);
    const key = await screen.findByTestId('wa-gateway-key');
    expect(key.props.placeholder).toBe('Saved — leave blank to keep it');
    await submit();
    expect(callsTo(docs.CrmAppWhatsappSaveConfigDocument)[0]?.[1]).toEqual({
      input: { base_url: connection.base_url, api_key: undefined },
    });
    expect(await screen.findByText('The WhatsApp gateway refused this API key.')).toBeOnTheScreen();
    expect(screen.queryByTestId('wa-connect')).toBeNull();
  });

  it('generates a key for a valid URL only, and says it was saved', async () => {
    renderWithTheme(<WhatsAppGeneratorScreen />);
    fireEvent.changeText(await screen.findByTestId('wa-gateway-url'), 'not a url');
    await act(async () => fireEvent.press(screen.getByTestId('wa-gateway-generate')));
    expect(screen.getByText('Enter the full URL, starting with https://')).toBeOnTheScreen();
    expect(callsTo(docs.CrmAppWhatsappGenerateApiKeyDocument)).toHaveLength(0);
    fireEvent.changeText(screen.getByTestId('wa-gateway-url'), ' https://wa.example.test ');
    await act(async () => fireEvent.press(screen.getByTestId('wa-gateway-generate')));
    expect(callsTo(docs.CrmAppWhatsappGenerateApiKeyDocument)[0]?.[1]).toEqual({
      base_url: 'https://wa.example.test',
    });
    expect(
      await screen.findByText('A new API key was created on the gateway and saved here.'),
    ).toBeOnTheScreen();
  });

  it('shows a failed key generation instead of the notice', async () => {
    serve(
      new Map<unknown, Handler>([
        [
          docs.CrmAppWhatsappGenerateApiKeyDocument,
          () => Promise.reject(new Error('No gateway master key')),
        ],
      ]),
    );
    renderWithTheme(<WhatsAppGeneratorScreen />);
    // Found outside act(): act holds back renders, so a find inside it never sees the screen load.
    const generate = await screen.findByTestId('wa-gateway-generate');
    await act(async () => fireEvent.press(generate));
    expect(await screen.findByText('No gateway master key')).toBeOnTheScreen();
    expect(screen.queryByTestId('wa-gateway-notice')).toBeNull();
  });
});

describe('WhatsAppGeneratorScreen — loading the connection', () => {
  it('shows why the connection could not be read, and tries again', async () => {
    serve(
      new Map<unknown, Handler>([
        [docs.CrmAppWhatsappConnectionDocument, () => Promise.reject(new Error('Gateway offline'))],
      ]),
    );
    renderWithTheme(<WhatsAppGeneratorScreen />);
    expect(await screen.findByText('Gateway offline')).toBeOnTheScreen();
    serve();
    await act(async () => fireEvent.press(screen.getByTestId('state-retry')));
    expect(await screen.findByText('Gateway URL & API key')).toBeOnTheScreen();
  });

  it('reads the latest extraction job when it opens', async () => {
    renderWithTheme(<WhatsAppGeneratorScreen />);
    await screen.findByText('Gateway URL & API key');
    expect(callsTo(docs.CrmAppWhatsappExtractionDocument)).toHaveLength(1);
  });
});
