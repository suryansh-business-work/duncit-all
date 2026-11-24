import forge from 'node-forge';
import type { WalletTicket } from '../wallet-ticket';

/** Test helper: a ticket as the wallet builders receive it. */
export const walletTicket = (over: Partial<WalletTicket> = {}): WalletTicket => ({
  id: '65f0c0ffee0000000000abcd',
  pod_id: '65f0c0ffee00000000001234',
  brand: 'Duncit',
  ticket_code: 'TKT-4821',
  qr_token: 'eyJ0IjoiVEtULTQ4MjEifQ.c2ln',
  seats: 1,
  event_title: 'Sunday Pickleball',
  starts_at: '2026-11-26T03:30:00.000Z',
  ends_at: '2026-11-26T05:30:00.000Z',
  date_label: '26 Nov 2026 · 09:00 AM',
  mode: 'PHYSICAL',
  venue_name: 'Smash Arena',
  venue_address: 'Sector 62, Noida',
  meeting_platform: null,
  attendee_name: 'Asha Rao',
  ...over,
});

const UID_OID = '0.9.2342.19200300.100.1.1';

export interface TestCertificate {
  cert: forge.pki.Certificate;
  key: forge.pki.rsa.PrivateKey;
  certPem: string;
  keyPem: string;
}

/**
 * Test helper: a self-signed certificate shaped like the one Apple issues for a
 * Pass Type ID (UID = pass type, OU = team). Pass an empty subject list for a
 * plain certificate such as the stand-in WWDR intermediate.
 */
export function testCertificate(subject: forge.pki.CertificateField[]): TestCertificate {
  const keys = forge.pki.rsa.generateKeyPair({ bits: 2048, e: 0x10001 });
  const cert = forge.pki.createCertificate();
  cert.publicKey = keys.publicKey;
  cert.serialNumber = '01';
  cert.validity.notBefore = new Date(Date.now() - 60_000);
  cert.validity.notAfter = new Date(Date.now() + 86_400_000);
  const attrs = [{ shortName: 'CN', value: 'Test' }, ...subject];
  cert.setSubject(attrs);
  cert.setIssuer(attrs);
  cert.sign(keys.privateKey, forge.md.sha256.create());
  return {
    cert,
    key: keys.privateKey,
    certPem: forge.pki.certificateToPem(cert),
    keyPem: forge.pki.privateKeyToPem(keys.privateKey),
  };
}

export const passTypeSubject = (passType = 'pass.com.duncit.test', team = 'TEAM123456'): forge.pki.CertificateField[] => [
  { type: UID_OID, value: passType },
  { shortName: 'OU', value: team },
];
