import { generateKeyPair } from 'node:crypto';
import { promisify } from 'node:util';
import forge from 'node-forge';

/**
 * The key material behind an iOS signing identity: the key pair the server
 * generates, the certificate signing request Apple signs, and the .p12 a Mac
 * keychain imports. Node's crypto makes the key (natively, off the event loop);
 * node-forge does what Node's crypto cannot — build a CSR and a PKCS#12.
 */

const generateRsaKeyPair = promisify(generateKeyPair);

export interface SigningRequest {
  /** PKCS#1 PEM. Never leaves the server except inside a .p12. */
  privateKeyPem: string;
  csrPem: string;
}

const certificateFromBase64 = (derBase64: string) =>
  forge.pki.certificateFromAsn1(forge.asn1.fromDer(forge.util.decode64(derBase64)));

/** A fresh 2048-bit RSA key and the certificate signing request for it. */
export async function newSigningRequest(commonName: string): Promise<SigningRequest> {
  const { privateKey } = await generateRsaKeyPair('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs1', format: 'pem' },
  });
  const key = forge.pki.privateKeyFromPem(privateKey) as forge.pki.rsa.PrivateKey;
  const csr = forge.pki.createCertificationRequest();
  csr.publicKey = forge.pki.setRsaPublicKey(key.n, key.e);
  csr.setSubject([{ name: 'commonName', value: commonName }]);
  csr.sign(key, forge.md.sha256.create());
  return { privateKeyPem: privateKey, csrPem: forge.pki.certificationRequestToPem(csr) };
}

/** The Team ID Apple wrote into the certificate's subject, as its OU. */
export function certificateTeamId(certBase64: string): string {
  const ou = certificateFromBase64(certBase64).subject.getField('OU');
  return String(ou?.value ?? '');
}

/**
 * The key and its certificate as one password-protected .p12, base64. 3DES,
 * not forge's AES default: macOS `security import` — the CI runner's keychain
 * — rejects a PKCS#12 encrypted with the newer ciphers.
 */
export function buildP12(privateKeyPem: string, certBase64: string, password: string): string {
  const key = forge.pki.privateKeyFromPem(privateKeyPem);
  const p12 = forge.pkcs12.toPkcs12Asn1(key, [certificateFromBase64(certBase64)], password, {
    algorithm: '3des',
  });
  return forge.util.encode64(forge.asn1.toDer(p12).getBytes());
}
