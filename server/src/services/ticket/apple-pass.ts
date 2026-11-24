import { createHash } from 'node:crypto';
import forge from 'node-forge';
import { zipStore } from '@utils/zip-store';
import { TICKET_ACCENT } from './ticket.pdf';
import { isoOrNull, walletPlace, type WalletTicket } from './wallet-ticket';

/**
 * An Apple Wallet event ticket (.pkpass).
 *
 * A pass is a zip of pass.json, its images, a manifest of every file's SHA-1,
 * and a detached PKCS#7 signature of that manifest made with the Pass Type ID
 * certificate (with Apple's WWDR intermediate in the chain). Wallet refuses a
 * pass whose manifest or signature does not match byte for byte, which is why
 * everything here is hashed from the exact buffers that get zipped.
 */

export interface ApplePassSigner {
  passTypeIdentifier: string;
  teamIdentifier: string;
  certificate: forge.pki.Certificate;
  wwdr: forge.pki.Certificate;
  privateKey: forge.pki.rsa.PrivateKey;
}

const WHITE = 'rgb(255, 255, 255)';

/** `#RRGGBB` → `rgb(r, g, b)`, the only colour form pass.json accepts. */
export function hexToPassRgb(hex: string): string {
  const n = Number.parseInt(hex.replace('#', ''), 16);
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`;
}

type PassField = { key: string; label: string; value: string };

export function passJson(t: WalletTicket, signer: Pick<ApplePassSigner, 'passTypeIdentifier' | 'teamIdentifier'>) {
  const place = walletPlace(t);
  const seats = Math.max(1, Math.floor(Number(t.seats) || 1));
  const auxiliary: PassField[] = [{ key: 'place', label: place.label, value: place.value }];
  if (seats > 1) auxiliary.push({ key: 'admits', label: 'ADMITS', value: `${seats} people` });
  const back: PassField[] = [
    { key: 'attendee', label: 'ATTENDEE', value: t.attendee_name || '—' },
    { key: 'code', label: 'TICKET', value: t.ticket_code },
  ];
  if (t.mode !== 'VIRTUAL' && t.venue_address) back.unshift({ key: 'address', label: 'ADDRESS', value: t.venue_address });
  const barcode = {
    format: 'PKBarcodeFormatQR',
    message: t.qr_token,
    messageEncoding: 'iso-8859-1',
    altText: t.ticket_code,
  };
  const relevantDate = isoOrNull(t.starts_at);
  return {
    formatVersion: 1,
    passTypeIdentifier: signer.passTypeIdentifier,
    teamIdentifier: signer.teamIdentifier,
    serialNumber: t.id,
    organizationName: t.brand,
    description: `${t.brand} ticket: ${t.event_title}`,
    backgroundColor: hexToPassRgb(TICKET_ACCENT),
    foregroundColor: WHITE,
    labelColor: WHITE,
    ...(relevantDate ? { relevantDate } : {}),
    barcodes: [barcode],
    // iOS 8 and older read only the singular key.
    barcode,
    eventTicket: {
      primaryFields: [{ key: 'event', label: 'EVENT', value: t.event_title }],
      secondaryFields: [{ key: 'when', label: 'WHEN', value: t.date_label || '—' }],
      auxiliaryFields: auxiliary,
      backFields: back,
    },
  };
}

/** The detached PKCS#7 (DER) signature of the manifest. */
export function signManifest(manifest: Buffer, signer: ApplePassSigner, signedAt: Date = new Date()): Buffer {
  const p7 = forge.pkcs7.createSignedData();
  p7.content = forge.util.createBuffer(manifest.toString('binary'));
  p7.addCertificate(signer.certificate);
  p7.addCertificate(signer.wwdr);
  p7.addSigner({
    key: signer.privateKey,
    certificate: signer.certificate,
    digestAlgorithm: forge.pki.oids.sha256,
    authenticatedAttributes: [
      { type: forge.pki.oids.contentType, value: forge.pki.oids.data },
      { type: forge.pki.oids.messageDigest },
      { type: forge.pki.oids.signingTime, value: signedAt.toISOString() },
    ],
  });
  p7.sign({ detached: true });
  return Buffer.from(forge.asn1.toDer(p7.toAsn1()).getBytes(), 'binary');
}

/** The finished .pkpass bytes. */
export function buildApplePass(t: WalletTicket, signer: ApplePassSigner, images: Record<string, Buffer>): Buffer {
  const files: Record<string, Buffer> = {
    'pass.json': Buffer.from(JSON.stringify(passJson(t, signer))),
    ...images,
  };
  const manifestObject = Object.fromEntries(
    Object.entries(files).map(([name, data]) => [name, createHash('sha1').update(data).digest('hex')])
  );
  const manifest = Buffer.from(JSON.stringify(manifestObject));
  return zipStore([
    ...Object.entries(files).map(([name, data]) => ({ name, data })),
    { name: 'manifest.json', data: manifest },
    { name: 'signature', data: signManifest(manifest, signer) },
  ]);
}
