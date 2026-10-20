import { truecallerAuthService } from '../../truecaller.service';
import { truecallerResolvers } from '../../truecaller.resolver';
import { fetchWebProfile, verifyAndroidCode, verifyIosProfile } from '../../truecaller.verify';
import { claimWebRequest, startWebRequest, webRequestState } from '../../truecaller.web';
import { TruecallerRequestModel } from '../../truecaller.model';
import { accountFor } from '@modules/access/auth/password-reset.service';
import { otpService } from '@modules/platform/otp/otp.service';
import { userService } from '@modules/access/user/user.service';

jest.mock('../../truecaller.verify', () => ({
  verifyAndroidCode: jest.fn(),
  verifyIosProfile: jest.fn(),
  fetchWebProfile: jest.fn(),
}));
jest.mock('../../truecaller.web', () => ({
  claimWebRequest: jest.fn(),
  startWebRequest: jest.fn(),
  webRequestState: jest.fn(),
}));
jest.mock('../../truecaller.model', () => ({
  TRUECALLER_REQUEST_TTL_MS: 600_000,
  TruecallerRequestModel: { create: jest.fn() },
}));
jest.mock('@modules/access/auth/password-reset.service', () => ({ accountFor: jest.fn() }));
jest.mock('@modules/platform/otp/otp.service', () => ({ otpService: { attest: jest.fn() } }));
jest.mock('@modules/access/user/user.service', () => ({
  userService: { loginWithProvenChallenge: jest.fn() },
}));

const identity = {
  phone_extension: '+91',
  phone_number: '9845012345',
  first_name: 'Riya',
  last_name: 'Sharma',
  email: '',
};
const target = { phone_extension: '+91', phone_number: '9845012345' };
const mocked = <T>(fn: T) => fn as unknown as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mocked(verifyAndroidCode).mockResolvedValue(identity);
  mocked(verifyIosProfile).mockResolvedValue(identity);
  mocked(fetchWebProfile).mockResolvedValue(identity);
  mocked(accountFor).mockResolvedValue(null);
  mocked(otpService.attest).mockResolvedValue({ challenge: { _id: 'ch1' }, token: 'ch1.secret' });
});

describe('continueWithTruecaller', () => {
  it('signs a known number in through the OTP login door, with a LOGIN proof naming that account', async () => {
    mocked(accountFor).mockResolvedValue({ _id: 'u1' });
    mocked(userService.loginWithProvenChallenge).mockResolvedValue({ token: 'jwt', user: { user_id: 'u1' } });
    const signIn = { deviceId: 'd1' };

    const result = await truecallerAuthService.continueWithTruecaller(
      { platform: 'ANDROID', authorization_code: ' code ', code_verifier: 'ver' },
      signIn
    );

    expect(verifyAndroidCode).toHaveBeenCalledWith('code', 'ver');
    expect(accountFor).toHaveBeenCalledWith(target);
    expect(otpService.attest).toHaveBeenCalledWith('LOGIN', target, { user_id: 'u1', attested_by: 'TRUECALLER' });
    expect(userService.loginWithProvenChallenge).toHaveBeenCalledWith({ _id: 'ch1' }, 'TRUECALLER', signIn);
    expect(result).toEqual({ status: 'SIGNED_IN', auth: { token: 'jwt', user: { user_id: 'u1' } }, signup: null });
  });

  it('hands a new number the signup proof that stands in for the WhatsApp code', async () => {
    const result = await truecallerAuthService.continueWithTruecaller({
      platform: 'ANDROID',
      authorization_code: 'code',
      code_verifier: 'ver',
    });

    expect(otpService.attest).toHaveBeenCalledWith('WHATSAPP_SIGNUP', target, { attested_by: 'TRUECALLER' });
    expect(userService.loginWithProvenChallenge).not.toHaveBeenCalled();
    expect(result).toEqual({
      status: 'SIGNUP_REQUIRED',
      auth: null,
      signup: { whatsapp_token: 'ch1.secret', ...identity },
    });
  });

  it.each([
    [{ platform: 'ANDROID' as const, code_verifier: 'v' }, 'authorization_code'],
    [{ platform: 'ANDROID' as const, authorization_code: 'c', code_verifier: '  ' }, 'code_verifier'],
    [{ platform: 'IOS' as const, signature: 's', signature_algorithm: 'a' }, 'payload'],
    [{ platform: 'WEB' as const, request_nonce: 'x'.repeat(9000) }, 'request_nonce'],
  ])('refuses %j without asking Truecaller', async (input, field) => {
    await expect(truecallerAuthService.continueWithTruecaller(input)).rejects.toMatchObject({
      message: `${field} is required`,
      extensions: { code: 'BAD_USER_INPUT' },
    });
    expect(verifyAndroidCode).not.toHaveBeenCalled();
    expect(otpService.attest).not.toHaveBeenCalled();
  });

  it('checks an iOS profile, then spends it so the same signature cannot sign in twice', async () => {
    await truecallerAuthService.continueWithTruecaller({
      platform: 'IOS',
      payload: 'cGF5bG9hZA==',
      signature: 'sig',
      signature_algorithm: 'SHA512withRSA',
    });

    expect(verifyIosProfile).toHaveBeenCalledWith('cGF5bG9hZA==', 'sig', 'SHA512withRSA');
    expect(TruecallerRequestModel.create).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'IOS', state: 'USED', key: expect.stringMatching(/^[a-f0-9]{64}$/) })
    );
  });

  it('refuses an iOS profile that was already spent, and passes any other write failure through', async () => {
    const ios = { platform: 'IOS' as const, payload: 'p', signature: 's', signature_algorithm: 'a' };
    mocked(TruecallerRequestModel.create).mockRejectedValueOnce(
      Object.assign(new Error('E11000 duplicate key'), { code: 11000 })
    );
    await expect(truecallerAuthService.continueWithTruecaller(ios)).rejects.toMatchObject({
      extensions: { code: 'TRUECALLER_REJECTED', reason: 'profile already used' },
    });
    mocked(TruecallerRequestModel.create).mockRejectedValueOnce(new Error('db down'));
    await expect(truecallerAuthService.continueWithTruecaller(ios)).rejects.toThrow('db down');
    expect(otpService.attest).not.toHaveBeenCalled();
  });

  it('spends a READY mobile-web nonce and reads the profile behind its token', async () => {
    mocked(claimWebRequest).mockResolvedValue({ access_token: 'at', endpoint: 'https://p.truecaller.com/v1' });
    await truecallerAuthService.continueWithTruecaller({ platform: 'WEB', request_nonce: 'nonce' });
    expect(claimWebRequest).toHaveBeenCalledWith('nonce');
    expect(fetchWebProfile).toHaveBeenCalledWith('at', 'https://p.truecaller.com/v1');
  });

  it('tells the page to start again when the nonce is not READY any more', async () => {
    mocked(claimWebRequest).mockResolvedValue(null);
    await expect(
      truecallerAuthService.continueWithTruecaller({ platform: 'WEB', request_nonce: 'nonce' })
    ).rejects.toMatchObject({ extensions: { code: 'BAD_USER_INPUT' } });
    expect(fetchWebProfile).not.toHaveBeenCalled();
  });
});

describe('web handshake passthroughs and resolvers', () => {
  it('starts and reads mobile-web requests, defaulting the language to blank', async () => {
    mocked(startWebRequest).mockResolvedValue({ request_nonce: 'n', deep_link: 'l' });
    mocked(webRequestState).mockResolvedValue('PENDING');
    const signInOf = jest.fn().mockReturnValue({ deviceId: 'd' });
    const resolvers = truecallerResolvers(signInOf);

    await resolvers.Mutation.startTruecallerWebLogin(null, { intent: 'LOGIN', lang: null });
    expect(startWebRequest).toHaveBeenCalledWith('LOGIN', '');
    expect(await resolvers.Query.truecallerWebState(null, { request_nonce: 'n' })).toBe('PENDING');
    await expect(truecallerAuthService.webState('')).rejects.toMatchObject({
      extensions: { code: 'BAD_USER_INPUT' },
    });

    const ctx = { req: {} } as never;
    await resolvers.Mutation.loginWithTruecaller(
      null,
      { input: { platform: 'ANDROID', authorization_code: 'c', code_verifier: 'v' } },
      ctx
    );
    expect(signInOf).toHaveBeenCalledWith(ctx);
    expect(otpService.attest).toHaveBeenCalledWith('WHATSAPP_SIGNUP', target, { attested_by: 'TRUECALLER' });
  });
});
