import { identityFrom } from '../../truecaller.identity';
import {
  isTruecallerProfileUrl,
  truecallerConfig,
  truecallerNotConfigured,
  truecallerOAuthUrls,
  truecallerRejected,
} from '../../truecaller.config';
import { getRuntimeEnvValue } from '@config/runtimeEnv';

jest.mock('@config/runtimeEnv', () => ({ getRuntimeEnvValue: jest.fn() }));
const mockEnv = getRuntimeEnvValue as jest.Mock;

describe('identityFrom', () => {
  it('splits the number on the calling code the country really uses', () => {
    expect(
      identityFrom({
        phone: '919845012345',
        country: 'in',
        firstName: ' Riya ',
        lastName: 'Sharma',
        email: ' Riya@Example.COM ',
      })
    ).toEqual({
      phone_extension: '+91',
      phone_number: '9845012345',
      first_name: 'Riya',
      last_name: 'Sharma',
      email: 'riya@example.com',
    });
  });

  it('accepts the number with a plus and as a JSON number', () => {
    expect(identityFrom({ phone: '+1 (415) 555-0100', country: 'US' }).phone_extension).toBe('+1');
    expect(identityFrom({ phone: 919845012345, country: 'IN' }).phone_number).toBe('9845012345');
  });

  it('prefers the longest calling code of a country that has several', () => {
    // The Dominican Republic dials 1809, 1829 and 1849 — never just +1.
    expect(identityFrom({ phone: '18295550123', country: 'DO' })).toMatchObject({
      phone_extension: '+1829',
      phone_number: '5550123',
    });
  });

  it('refuses a number that does not open on its own country code', () => {
    expect(() => identityFrom({ phone: '449845012345', country: 'IN' })).toThrow(
      expect.objectContaining({ extensions: expect.objectContaining({ code: 'TRUECALLER_REJECTED' }) })
    );
  });

  it('refuses a profile with no country or no number', () => {
    expect(() => identityFrom({ phone: '919845012345', country: undefined })).toThrow(/Truecaller/);
    expect(() => identityFrom({ phone: undefined, country: 'IN' })).toThrow(/Truecaller/);
  });

  it('drops an address that is not one, and blanks names that are not text', () => {
    const identity = identityFrom({ phone: '919845012345', country: 'IN', firstName: 7, email: 'not-mail' });
    expect(identity.email).toBe('');
    expect(identity.first_name).toBe('');
    expect(identity.last_name).toBe('');
  });
});

describe('truecaller config', () => {
  it('only lets a Truecaller https host serve a mobile-web profile', () => {
    expect(isTruecallerProfileUrl('https://profile4-noneu.truecaller.com/v1/default')).toBe(true);
    expect(isTruecallerProfileUrl('http://profile4-noneu.truecaller.com/v1/default')).toBe(false);
    expect(isTruecallerProfileUrl('https://truecaller.com.attacker.example/v1')).toBe(false);
    expect(isTruecallerProfileUrl('not a url')).toBe(false);
  });

  it('builds both OAuth endpoints for a region', () => {
    expect(truecallerOAuthUrls('eu')).toEqual({
      token: 'https://oauth-account-eu.truecaller.com/v1/token',
      userinfo: 'https://oauth-account-eu.truecaller.com/v1/userinfo',
    });
  });

  it('reads the Tech entry trimmed, with noneu unless eu is asked for', async () => {
    mockEnv.mockImplementation(async (key: string) =>
      ({
        TRUECALLER_ANDROID_CLIENT_ID: ' cid ',
        TRUECALLER_APP_KEY: 'key',
        TRUECALLER_PARTNER_NAME: ' Duncit ',
        TRUECALLER_REGION: ' EU ',
      })[key] ?? ''
    );
    expect(await truecallerConfig()).toEqual({
      androidClientId: 'cid',
      appKey: 'key',
      partnerName: 'Duncit',
      region: 'eu',
    });
    mockEnv.mockResolvedValue('');
    expect((await truecallerConfig()).region).toBe('noneu');
  });

  it('names its refusals with codes the clients branch on', () => {
    expect(truecallerNotConfigured().extensions.code).toBe('NOT_CONFIGURED');
    expect(truecallerRejected('why').extensions).toEqual({ code: 'TRUECALLER_REJECTED', reason: 'why' });
  });
});
