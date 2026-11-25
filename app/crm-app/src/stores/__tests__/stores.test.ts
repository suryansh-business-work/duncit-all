import * as SecureStore from 'expo-secure-store';

const mockPhone = { setFeatures: jest.fn(), takePendingPostCall: jest.fn() };
jest.mock('crm-telephony', () => ({
  get CrmTelephony() {
    return mockPhone;
  },
}));
jest.mock('@/services/graphql.client', () => ({ gqlRequest: jest.fn() }));

import { gqlRequest } from '@/services/graphql.client';
import { STORAGE_KEYS } from '@/services/secure-storage';
import { DEFAULT_FEATURES, parseFeatures, useFeaturesStore } from '../features.store';
import { useLocaleStore } from '../locale.store';
import { usePostCallStore } from '../postCall.store';

const store = (SecureStore as unknown as { __store: Map<string, string> }).__store;
const request = gqlRequest as jest.Mock;

beforeEach(() => {
  store.clear();
  jest.clearAllMocks();
});

describe('features', () => {
  it('reads what was stored and defaults anything missing or broken', () => {
    expect(parseFeatures(null)).toEqual(DEFAULT_FEATURES);
    expect(parseFeatures('{oops')).toEqual(DEFAULT_FEATURES);
    expect(parseFeatures('{"callerId":false,"autoLog":"yes"}')).toEqual({ callerId: false, autoLog: true, recordings: true });
  });

  it('pushes the switches to the Android side and stores them', async () => {
    useFeaturesStore.setState({ ...DEFAULT_FEATURES, autoLog: false });
    await useFeaturesStore.getState().set({ callerId: false });
    expect(mockPhone.setFeatures).toHaveBeenLastCalledWith(false, false);
    expect(JSON.parse(store.get(STORAGE_KEYS.features) ?? '{}')).toEqual({ callerId: false, autoLog: false, recordings: true });
  });

  it('starts logging from the moment it is switched on', async () => {
    useFeaturesStore.setState({ ...DEFAULT_FEATURES, autoLog: false });
    const before = Date.now();
    await useFeaturesStore.getState().set({ autoLog: true });
    expect(Number(store.get(STORAGE_KEYS.callCheckpoint))).toBeGreaterThanOrEqual(before);
  });

  it('hydrates from storage and tells the Android side', async () => {
    store.set(STORAGE_KEYS.features, '{"callerId":true,"autoLog":false,"recordings":false}');
    await useFeaturesStore.getState().hydrate();
    expect(useFeaturesStore.getState()).toMatchObject({ hydrated: true, autoLog: false, recordings: false });
    expect(mockPhone.setFeatures).toHaveBeenCalledWith(true, false);
  });
});

describe('locale', () => {
  it('loads the account language’s catalogue, falling back to the default locale', async () => {
    request
      .mockResolvedValueOnce({ publicLocales: [{ code: 'en-IN', is_rtl: false, is_default: true }, { code: 'hi-IN', is_rtl: false, is_default: false }] })
      .mockResolvedValueOnce({ publicTranslations: [{ key: 'crmApp.tabs.home', value: 'होम' }] });
    await useLocaleStore.getState().load('hi-IN');
    expect(useLocaleStore.getState()).toMatchObject({ locale: 'hi-IN', catalogue: { 'crmApp.tabs.home': 'होम' } });
    expect(request.mock.calls[1][1]).toEqual({ locale: 'hi-IN' });
  });

  it('keeps the bundled copy when the server cannot be reached', async () => {
    useLocaleStore.setState({ locale: 'en-IN', catalogue: {} });
    request.mockRejectedValueOnce(new Error('offline'));
    await useLocaleStore.getState().load(null);
    expect(useLocaleStore.getState().catalogue).toEqual({});
  });
});

describe('post-call hand-off', () => {
  it('collects what the call receiver left, once', () => {
    mockPhone.takePendingPostCall.mockReturnValueOnce({ number: '9811000001', direction: 'OUTBOUND', answered: true, startedAt: 1, endedAt: 2 }).mockReturnValueOnce(null);
    expect(usePostCallStore.getState().collect()).toBe(true);
    expect(usePostCallStore.getState().pending?.number).toBe('9811000001');
    usePostCallStore.getState().dismiss();
    expect(usePostCallStore.getState().collect()).toBe(false);
  });
});
