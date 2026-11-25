import { Linking, PermissionsAndroid } from 'react-native';

import { resolveApiUrl } from '@/constants/config';
import { ApiError, errorCode, errorMessage } from '@/utils/errors';
import { dialNumber, dialable, whatsappUrl } from '../dialer';
import { permissionsFor, readPermissions, requestPermission } from '../permissions';
import {
  clearToken,
  getToken,
  needsSecurityVerification,
  peekToken,
  resetTokenCache,
  setToken,
} from '../session';

const mockPhone = {
  placeCall: jest.fn(),
  canDrawOverlays: jest.fn(() => false),
  openOverlaySettings: jest.fn(),
};
jest.mock('crm-telephony', () => ({
  get CrmTelephony() {
    return mockPhone;
  },
}));

afterEach(() => jest.restoreAllMocks());

describe('config', () => {
  it('normalises the API origin and falls back to staging', () => {
    expect(resolveApiUrl('https://server.duncit.com/graphql/')).toBe('https://server.duncit.com');
    expect(resolveApiUrl(' ')).toBe('https://staging.server.duncit.com');
    expect(resolveApiUrl(undefined)).toBe('https://staging.server.duncit.com');
  });
});

describe('errors', () => {
  it('words a thrown value and reads its server code', () => {
    expect(errorMessage(new ApiError('Lead not found', 200, { code: 'NOT_FOUND' }), 'x')).toBe(
      'Lead not found',
    );
    expect(errorMessage('weird', 'fallback')).toBe('fallback');
    expect(errorCode(new ApiError('x', 401, { code: 'UNAUTHENTICATED' }))).toBe('UNAUTHENTICATED');
    expect(errorCode(new ApiError('x', 500, { code: 7 }))).toBeUndefined();
    expect(errorCode(new Error('x'))).toBeUndefined();
  });
});

describe('session', () => {
  beforeEach(() => resetTokenCache());

  it('keeps the token in the secure store and in memory', async () => {
    expect(await getToken()).toBeNull();
    await setToken('t1');
    expect(peekToken()).toBe('t1');
    resetTokenCache();
    expect(await getToken()).toBe('t1');
    await clearToken();
    expect(await getToken()).toBeNull();
  });

  it('owes Security Verification only for a pending console claim', () => {
    const jwt = (psv: object) =>
      `h.${Buffer.from(JSON.stringify({ psv })).toString('base64url')}.s`;
    expect(needsSecurityVerification(jwt({ portal: 'crm', verified: false }))).toBe(true);
    expect(needsSecurityVerification(jwt({ portal: 'crm', verified: true }))).toBe(false);
    expect(needsSecurityVerification(null)).toBe(false);
  });
});

describe('dialer', () => {
  it('keeps only what a dialler understands', () => {
    expect(dialable('+91 (98110) 00-001 ext')).toBe('+919811000001');
    expect(whatsappUrl('+91 98110 00001')).toBe('https://wa.me/919811000001');
  });

  it('calls straight away when allowed, or opens the phone dialer', async () => {
    mockPhone.placeCall.mockReturnValueOnce(true).mockReturnValueOnce(false);
    await expect(dialNumber('98110 00001')).resolves.toBe('called');
    await expect(dialNumber('98110 00001')).resolves.toBe('dialer');
    expect(mockPhone.placeCall).toHaveBeenCalledWith('9811000001');
  });

  it('falls back to a tel: link, and says when nothing can dial', async () => {
    mockPhone.placeCall.mockImplementation(() => {
      throw new Error('no activity');
    });
    jest.spyOn(Linking, 'canOpenURL').mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    await expect(dialNumber('9811000001')).resolves.toBe('dialer');
    expect(open).toHaveBeenCalledWith('tel:9811000001');
    await expect(dialNumber('9811000001')).resolves.toBe('unavailable');
    await expect(dialNumber('call me')).resolves.toBe('unavailable');
  });
});

describe('permissions', () => {
  const P = PermissionsAndroid.PERMISSIONS;

  it('asks for the right Android permissions per feature and Android version', () => {
    expect(permissionsFor('phone')).toEqual([P.READ_PHONE_STATE, P.READ_CALL_LOG]);
    expect(permissionsFor('call')).toEqual([P.CALL_PHONE]);
    expect(permissionsFor('notifications', 33)).toEqual([P.POST_NOTIFICATIONS]);
    expect(permissionsFor('notifications', 31)).toEqual([]);
    expect(permissionsFor('audio', 33)).toEqual([P.READ_MEDIA_AUDIO]);
    expect(permissionsFor('audio', 30)).toEqual([P.READ_EXTERNAL_STORAGE]);
  });

  it('reads each group, with the overlay access from the phone side', async () => {
    jest.spyOn(PermissionsAndroid, 'check').mockImplementation(async (p) => p === P.CALL_PHONE);
    const state = await readPermissions();
    expect(state).toMatchObject({ call: true, phone: false, overlay: false });
  });

  it('sends a refused-for-good permission to Settings, and the overlay to its own screen', async () => {
    jest
      .spyOn(PermissionsAndroid, 'requestMultiple')
      .mockResolvedValue({ [P.CALL_PHONE]: 'never_ask_again' } as never);
    const settings = jest.spyOn(Linking, 'openSettings').mockResolvedValue();
    await requestPermission('call');
    expect(settings).toHaveBeenCalled();
    await requestPermission('overlay');
    expect(mockPhone.openOverlaySettings).toHaveBeenCalled();
  });
});
