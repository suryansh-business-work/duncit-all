import { createHash, createPublicKey, verify } from 'node:crypto';
import forge from 'node-forge';
import { buildApplePass, hexToPassRgb, passJson, signManifest, type ApplePassSigner } from '../../apple-pass';
import { TICKET_ACCENT } from '../../ticket.pdf';
import { zipFiles } from '../../../../utils/__tests__/zip-reader';
import { passTypeSubject, testCertificate, walletTicket } from '../wallet-fixtures';

const pass = testCertificate(passTypeSubject());
const wwdr = testCertificate([{ shortName: 'O', value: 'Stand-in WWDR' }]);
const signer: ApplePassSigner = {
  passTypeIdentifier: 'pass.com.duncit.test',
  teamIdentifier: 'TEAM123456',
  certificate: pass.cert,
  wwdr: wwdr.cert,
  privateKey: pass.key,
};
const images = { 'icon.png': Buffer.from('icon-bytes'), 'logo.png': Buffer.from('logo-bytes') };

const MESSAGE_DIGEST_OID = forge.pki.oids.messageDigest;

/** Walk the detached PKCS#7 the way Wallet does and check the RSA signature
 * over the signed attributes, and that those attributes commit to `content`. */
function verifyDetachedSignature(signature: Buffer, content: Buffer, publicKeyPem: string) {
  const asn1 = forge.asn1.fromDer(forge.util.createBuffer(signature.toString('binary')));
  const msg = forge.pkcs7.messageFromAsn1(asn1) as forge.pkcs7.PkcsSignedData & {
    rawCapture: { signerInfos: forge.asn1.Asn1[]; content?: unknown };
  };
  const signerInfo = msg.rawCapture.signerInfos[0].value as forge.asn1.Asn1[];
  const attributes = signerInfo[3].value as forge.asn1.Asn1[];
  const signed = forge.asn1.toDer(
    forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.SET, true, attributes)
  ).getBytes();
  const digestAttr = attributes.find(
    (attr) => forge.asn1.derToOid((attr.value as forge.asn1.Asn1[])[0].value as string) === MESSAGE_DIGEST_OID
  );
  const digestSet = (digestAttr?.value as forge.asn1.Asn1[])[1].value as forge.asn1.Asn1[];
  return {
    certificates: msg.certificates.length,
    detached: msg.rawCapture.content === undefined,
    digestMatches:
      Buffer.from(digestSet[0].value as string, 'binary').toString('hex') ===
      createHash('sha256').update(content).digest('hex'),
    signatureValid: verify(
      'sha256',
      Buffer.from(signed, 'binary'),
      createPublicKey(publicKeyPem),
      Buffer.from((signerInfo[5].value as string) ?? '', 'binary')
    ),
  };
}

describe('hexToPassRgb', () => {
  it('turns the brand hex into the rgb() form pass.json requires', () => {
    expect(hexToPassRgb(TICKET_ACCENT)).toBe('rgb(248, 45, 47)');
    expect(hexToPassRgb('#000000')).toBe('rgb(0, 0, 0)');
  });
});

describe('passJson', () => {
  it('describes an in-person event ticket whose barcode is the check-in token', () => {
    const json = passJson(walletTicket(), signer);

    expect(json).toMatchObject({
      formatVersion: 1,
      passTypeIdentifier: 'pass.com.duncit.test',
      teamIdentifier: 'TEAM123456',
      serialNumber: '65f0c0ffee0000000000abcd',
      organizationName: 'Duncit',
      backgroundColor: 'rgb(248, 45, 47)',
      relevantDate: '2026-11-26T03:30:00.000Z',
    });
    expect(json.barcodes[0]).toEqual({
      format: 'PKBarcodeFormatQR',
      message: 'eyJ0IjoiVEtULTQ4MjEifQ.c2ln',
      messageEncoding: 'iso-8859-1',
      altText: 'TKT-4821',
    });
    expect(json.barcode).toEqual(json.barcodes[0]);
    expect(json.eventTicket.primaryFields[0].value).toBe('Sunday Pickleball');
    expect(json.eventTicket.secondaryFields[0].value).toBe('26 Nov 2026 · 09:00 AM');
    expect(json.eventTicket.auxiliaryFields).toEqual([{ key: 'place', label: 'VENUE', value: 'Smash Arena' }]);
    expect(json.eventTicket.backFields.map((f) => f.key)).toEqual(['address', 'attendee', 'code']);
  });

  it('names the meeting platform and drops the address for a virtual pod', () => {
    const json = passJson(walletTicket({ mode: 'VIRTUAL', meeting_platform: 'Google Meet' }), signer);

    expect(json.eventTicket.auxiliaryFields[0]).toEqual({ key: 'place', label: 'MEETING', value: 'Google Meet' });
    expect(json.eventTicket.backFields.map((f) => f.key)).toEqual(['attendee', 'code']);
  });

  it('says how many people a multi-seat ticket admits', () => {
    const json = passJson(walletTicket({ seats: 3 }), signer);
    expect(json.eventTicket.auxiliaryFields).toContainEqual({ key: 'admits', label: 'ADMITS', value: '3 people' });
  });

  it('leaves relevantDate out rather than send Wallet an invalid date', () => {
    expect(passJson(walletTicket({ starts_at: null }), signer)).not.toHaveProperty('relevantDate');
    expect(passJson(walletTicket({ starts_at: 'not a date' }), signer)).not.toHaveProperty('relevantDate');
  });
});

describe('signManifest', () => {
  it('makes a detached signature over the manifest that verifies with the pass certificate', () => {
    const manifest = Buffer.from('{"pass.json":"abc"}');
    const result = verifyDetachedSignature(signManifest(manifest, signer), manifest, forge.pki.publicKeyToPem(pass.cert.publicKey));

    expect(result).toEqual({ certificates: 2, detached: true, digestMatches: true, signatureValid: true });
  });

  it('does not verify against different content', () => {
    const result = verifyDetachedSignature(
      signManifest(Buffer.from('original'), signer),
      Buffer.from('tampered'),
      forge.pki.publicKeyToPem(pass.cert.publicKey)
    );
    expect(result.digestMatches).toBe(false);
  });
});

describe('buildApplePass', () => {
  it('zips pass.json, the images, a matching SHA-1 manifest and its signature', () => {
    const files = zipFiles(buildApplePass(walletTicket(), signer, images));

    expect(Object.keys(files).sort()).toEqual(['icon.png', 'logo.png', 'manifest.json', 'pass.json', 'signature']);
    const manifest = JSON.parse(files['manifest.json'].toString()) as Record<string, string>;
    expect(Object.keys(manifest).sort()).toEqual(['icon.png', 'logo.png', 'pass.json']);
    for (const [name, sha1] of Object.entries(manifest)) {
      expect(createHash('sha1').update(files[name]).digest('hex')).toBe(sha1);
    }
    expect(JSON.parse(files['pass.json'].toString()).serialNumber).toBe('65f0c0ffee0000000000abcd');
    const result = verifyDetachedSignature(
      files.signature,
      files['manifest.json'],
      forge.pki.publicKeyToPem(pass.cert.publicKey)
    );
    expect(result.signatureValid && result.digestMatches).toBe(true);
  });
});
