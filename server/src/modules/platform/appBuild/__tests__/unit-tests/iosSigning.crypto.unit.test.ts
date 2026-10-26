import forge from 'node-forge';
import { buildP12, certificateTeamId, newSigningRequest } from '../../iosSigning.crypto';

/** A self-signed certificate for `privateKeyPem`'s key, as Apple would hand it back (DER, base64). */
function certificateFor(keyPair: forge.pki.rsa.KeyPair, subject: forge.pki.CertificateField[]): string {
  const cert = forge.pki.createCertificate();
  cert.publicKey = keyPair.publicKey;
  cert.serialNumber = '01';
  cert.validity.notBefore = new Date('2026-01-01T00:00:00Z');
  cert.validity.notAfter = new Date('2027-01-01T00:00:00Z');
  cert.setSubject(subject);
  cert.setIssuer(subject);
  cert.sign(keyPair.privateKey, forge.md.sha256.create());
  return forge.util.encode64(forge.asn1.toDer(forge.pki.certificateToAsn1(cert)).getBytes());
}

describe('newSigningRequest', () => {
  it('makes a 2048-bit RSA key and a signed CSR carrying the common name', async () => {
    const { privateKeyPem, csrPem } = await newSigningRequest('Duncit Distribution');
    expect(privateKeyPem).toContain('BEGIN RSA PRIVATE KEY');
    const key = forge.pki.privateKeyFromPem(privateKeyPem) as forge.pki.rsa.PrivateKey;
    expect(key.n.bitLength()).toBe(2048);

    const csr = forge.pki.certificationRequestFromPem(csrPem);
    expect(csr.verify()).toBe(true);
    expect(csr.subject.getField('CN').value).toBe('Duncit Distribution');
    expect((csr.publicKey as forge.pki.rsa.PublicKey).n.toString(16)).toBe(key.n.toString(16));
  });

  it('never reuses a key between requests', async () => {
    const [a, b] = await Promise.all([newSigningRequest('A'), newSigningRequest('B')]);
    expect(a.privateKeyPem).not.toBe(b.privateKeyPem);
  });
});

describe('certificateTeamId', () => {
  const keyPair = forge.pki.rsa.generateKeyPair(1024);

  it('reads the Team ID from the certificate subject OU', () => {
    const der = certificateFor(keyPair, [{ name: 'commonName', value: 'Apple Distribution: Duncit' }, { name: 'organizationalUnitName', value: 'TEAM123XYZ' }]);
    expect(certificateTeamId(der)).toBe('TEAM123XYZ');
  });

  it('is empty when the certificate has no OU', () => {
    expect(certificateTeamId(certificateFor(keyPair, [{ name: 'commonName', value: 'No unit' }]))).toBe('');
  });
});

describe('buildP12', () => {
  it('packs the key and certificate into a password-protected 3DES .p12 that opens only with that password', () => {
    const keyPair = forge.pki.rsa.generateKeyPair(1024);
    const der = certificateFor(keyPair, [{ name: 'commonName', value: 'Duncit' }]);
    const keyPem = forge.pki.privateKeyToPem(keyPair.privateKey);
    const p12Base64 = buildP12(keyPem, der, 'p12-pass');

    const asn1 = forge.asn1.fromDer(forge.util.decode64(p12Base64));
    const p12 = forge.pkcs12.pkcs12FromAsn1(asn1, 'p12-pass');
    const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })[forge.pki.oids.pkcs8ShroudedKeyBag] ?? [];
    const certBags = p12.getBags({ bagType: forge.pki.oids.certBag })[forge.pki.oids.certBag] ?? [];
    expect(keyBags).toHaveLength(1);
    expect(certBags).toHaveLength(1);
    expect(forge.pki.privateKeyToPem(keyBags[0].key as forge.pki.PrivateKey)).toBe(keyPem);
    expect(certBags[0].cert?.subject.getField('CN').value).toBe('Duncit');
    // The cipher macOS `security import` accepts.
    expect(forge.asn1.toDer(asn1).getBytes()).toContain(forge.asn1.oidToDer(forge.pki.oids['pbeWithSHAAnd3-KeyTripleDES-CBC']).getBytes());
    expect(() => forge.pkcs12.pkcs12FromAsn1(asn1, 'wrong')).toThrow();
  });
});
