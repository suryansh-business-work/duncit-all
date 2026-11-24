import forge from 'node-forge';
import { getRuntimeEnvValue } from '@config/runtimeEnv';
import { logs } from '@observability/log';
import { parseServiceAccount, type GoogleServiceAccount } from '@utils/googleServiceAccount';
import type { ApplePassSigner } from '@services/ticket/apple-pass';

/**
 * The credentials behind the two wallet buttons, read from Tech portal →
 * Environment (APPLE_WALLET and GOOGLE_WALLET).
 *
 * Each resolves to null when its entry is missing or unusable, and the clients
 * hide that button: a pass nobody can sign is no button at all, rather than a
 * button that apologises. A broken entry is logged, so "the button vanished" is
 * one log search away from the reason.
 */

export type AppleWalletConfig = ApplePassSigner;

export interface GoogleWalletConfig {
  issuerId: string;
  account: GoogleServiceAccount;
}

/** Subject attribute "UID" — Apple puts the Pass Type ID there. */
const UID_OID = '0.9.2342.19200300.100.1.1';

const subjectValue = (cert: forge.pki.Certificate, match: { type?: string; shortName?: string }) => {
  const attr = cert.subject.attributes.find(
    (a) => (match.type && a.type === match.type) || (match.shortName && a.shortName === match.shortName)
  );
  return typeof attr?.value === 'string' ? attr.value.trim() : '';
};

function readPrivateKey(pem: string, passphrase: string): forge.pki.rsa.PrivateKey {
  if (pem.includes('ENCRYPTED')) {
    const key = forge.pki.decryptRsaPrivateKey(pem, passphrase);
    if (!key) throw new Error('The private key passphrase is wrong.');
    return key;
  }
  return forge.pki.privateKeyFromPem(pem);
}

/** Parse the four Apple values. Throws a readable reason when they do not fit together. */
export function parseAppleWallet(values: {
  certificate: string;
  privateKey: string;
  passphrase: string;
  wwdr: string;
}): AppleWalletConfig {
  const certificate = forge.pki.certificateFromPem(values.certificate);
  const passTypeIdentifier = subjectValue(certificate, { type: UID_OID });
  const teamIdentifier = subjectValue(certificate, { shortName: 'OU' });
  if (!passTypeIdentifier.startsWith('pass.') || !teamIdentifier) {
    throw new Error('The certificate is not a Pass Type ID certificate (no pass.* UID or team OU in its subject).');
  }
  return {
    passTypeIdentifier,
    teamIdentifier,
    certificate,
    wwdr: forge.pki.certificateFromPem(values.wwdr),
    privateKey: readPrivateKey(values.privateKey, values.passphrase),
  };
}

export async function appleWalletConfig(): Promise<AppleWalletConfig | null> {
  const [certificate, privateKey, passphrase, wwdr] = await Promise.all([
    getRuntimeEnvValue('APPLE_WALLET_CERTIFICATE'),
    getRuntimeEnvValue('APPLE_WALLET_PRIVATE_KEY'),
    getRuntimeEnvValue('APPLE_WALLET_KEY_PASSPHRASE'),
    getRuntimeEnvValue('APPLE_WALLET_WWDR_CERTIFICATE'),
  ]);
  if (!certificate.trim() || !privateKey.trim() || !wwdr.trim()) return null;
  try {
    return parseAppleWallet({ certificate, privateKey, passphrase, wwdr });
  } catch (error) {
    logs.server.error('wallet', 'appleWalletConfig', { error, msg: 'APPLE_WALLET entry is unusable' });
    return null;
  }
}

export async function googleWalletConfig(): Promise<GoogleWalletConfig | null> {
  const [issuerId, json] = await Promise.all([
    getRuntimeEnvValue('GOOGLE_WALLET_ISSUER_ID'),
    getRuntimeEnvValue('GOOGLE_WALLET_SERVICE_ACCOUNT_JSON'),
  ]);
  if (!issuerId.trim() || !json.trim()) return null;
  try {
    return { issuerId: issuerId.trim(), account: parseServiceAccount(json) };
  } catch (error) {
    logs.server.error('wallet', 'googleWalletConfig', { error, msg: 'GOOGLE_WALLET entry is unusable' });
    return null;
  }
}
