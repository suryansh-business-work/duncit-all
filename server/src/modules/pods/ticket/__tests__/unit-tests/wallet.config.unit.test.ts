import { generateKeyPairSync } from 'node:crypto';
import forge from 'node-forge';

const env: Record<string, string> = {};
jest.mock('@config/runtimeEnv', () => ({
  getRuntimeEnvValue: jest.fn(async (key: string) => env[key] ?? ''),
}));
const logError = jest.fn();
jest.mock('@observability/log', () => ({ logs: { server: { error: (...a: unknown[]) => logError(...a) } } }));

import { appleWalletConfig, googleWalletConfig, parseAppleWallet } from '../../wallet/wallet.config';
import { passTypeSubject, testCertificate } from '../../../../../services/ticket/__tests__/wallet-fixtures';

const pass = testCertificate(passTypeSubject('pass.com.duncit.ticket', 'A1B2C3D4E5'));
const wwdr = testCertificate([{ shortName: 'O', value: 'Stand-in WWDR' }]);
const serviceAccount = JSON.stringify({
  client_email: 'wallet@duncit-test.iam.gserviceaccount.com',
  private_key: generateKeyPairSync('rsa', {
    modulusLength: 2048,
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    publicKeyEncoding: { type: 'spki', format: 'pem' },
  }).privateKey,
});

const setAppleEnv = (over: Record<string, string> = {}) => {
  Object.assign(env, {
    APPLE_WALLET_CERTIFICATE: pass.certPem,
    APPLE_WALLET_PRIVATE_KEY: pass.keyPem,
    APPLE_WALLET_KEY_PASSPHRASE: '',
    APPLE_WALLET_WWDR_CERTIFICATE: wwdr.certPem,
    ...over,
  });
};

beforeEach(() => {
  for (const key of Object.keys(env)) delete env[key];
});

describe('parseAppleWallet', () => {
  it('reads the pass type and team from the certificate subject', () => {
    const config = parseAppleWallet({ certificate: pass.certPem, privateKey: pass.keyPem, passphrase: '', wwdr: wwdr.certPem });

    expect(config.passTypeIdentifier).toBe('pass.com.duncit.ticket');
    expect(config.teamIdentifier).toBe('A1B2C3D4E5');
    expect(config.wwdr.subject.getField('O').value).toBe('Stand-in WWDR');
  });

  it('refuses a certificate that is not a Pass Type ID certificate', () => {
    expect(() =>
      parseAppleWallet({ certificate: wwdr.certPem, privateKey: wwdr.keyPem, passphrase: '', wwdr: wwdr.certPem })
    ).toThrow('not a Pass Type ID certificate');
  });

  it('unlocks an encrypted key with its passphrase, and refuses the wrong one', () => {
    const encrypted = forge.pki.encryptRsaPrivateKey(pass.key, 'open-sesame');
    const config = parseAppleWallet({ certificate: pass.certPem, privateKey: encrypted, passphrase: 'open-sesame', wwdr: wwdr.certPem });

    expect(forge.pki.privateKeyToPem(config.privateKey)).toBe(pass.keyPem);
    expect(() =>
      parseAppleWallet({ certificate: pass.certPem, privateKey: encrypted, passphrase: 'wrong', wwdr: wwdr.certPem })
    ).toThrow();
  });
});

describe('appleWalletConfig', () => {
  it('is null, quietly, while the Tech portal has no Apple Wallet entry', async () => {
    expect(await appleWalletConfig()).toBeNull();
    setAppleEnv({ APPLE_WALLET_WWDR_CERTIFICATE: '' });
    expect(await appleWalletConfig()).toBeNull();
    expect(logError).not.toHaveBeenCalled();
  });

  it('is null and logged when the entry is unusable', async () => {
    setAppleEnv({ APPLE_WALLET_CERTIFICATE: wwdr.certPem });

    expect(await appleWalletConfig()).toBeNull();
    expect(logError).toHaveBeenCalledWith('wallet', 'appleWalletConfig', expect.objectContaining({ msg: 'APPLE_WALLET entry is unusable' }));
  });

  it('is the signer when the entry is complete', async () => {
    setAppleEnv();
    expect(await appleWalletConfig()).toMatchObject({ passTypeIdentifier: 'pass.com.duncit.ticket', teamIdentifier: 'A1B2C3D4E5' });
  });
});

describe('googleWalletConfig', () => {
  it('is null while either value is missing', async () => {
    expect(await googleWalletConfig()).toBeNull();
    env.GOOGLE_WALLET_ISSUER_ID = '3388000000022212345';
    expect(await googleWalletConfig()).toBeNull();
    expect(logError).not.toHaveBeenCalled();
  });

  it('is null and logged when the key is not a service account', async () => {
    env.GOOGLE_WALLET_ISSUER_ID = '3388000000022212345';
    env.GOOGLE_WALLET_SERVICE_ACCOUNT_JSON = '{"type":"authorized_user"}';

    expect(await googleWalletConfig()).toBeNull();
    expect(logError).toHaveBeenCalledWith('wallet', 'googleWalletConfig', expect.objectContaining({ msg: 'GOOGLE_WALLET entry is unusable' }));
  });

  it('is the issuer and account, trimmed, when complete', async () => {
    env.GOOGLE_WALLET_ISSUER_ID = ' 3388000000022212345 ';
    env.GOOGLE_WALLET_SERVICE_ACCOUNT_JSON = serviceAccount;

    expect(await googleWalletConfig()).toMatchObject({
      issuerId: '3388000000022212345',
      account: { client_email: 'wallet@duncit-test.iam.gserviceaccount.com' },
    });
  });
});
