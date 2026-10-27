import { X509Certificate } from 'node:crypto';
import { CERT_MARK, CONF_MARK, END_MARK, parseCertbotDump, toCertificate } from '../../ssl.parse';
import { EC_PEM, ED_PEM, NOSAN_PEM, RSA_PEM } from './ssl.fixtures';

const DAY = 86_400_000;
/** Every fixture is valid from 2026-10-26 for ten years, so this "now" is inside the window. */
const NOW = Date.parse('2027-01-01T00:00:00Z');

describe('toCertificate', () => {
  it('reads a single-name RSA certificate and its renewal conf', () => {
    const conf = ['version = 2.0', 'authenticator = nginx', 'installer=nginx', 'server = https://acme-v02.api.letsencrypt.org/directory', 'renew_before_expiry = 10 days'].join('\n');
    const cert = toCertificate('single', RSA_PEM, conf, NOW);
    expect(cert).toMatchObject({
      name: 'single',
      common_name: 'single.example.com',
      domains: ['single.example.com'],
      coverage: 'SINGLE',
      key_type: 'RSA 2048',
      issuer: 'Duncit Test',
      authenticator: 'nginx',
      installer: 'nginx',
      production_ca: true,
    });
    const validTo = new Date(new X509Certificate(RSA_PEM).validTo).getTime();
    expect(cert?.days_remaining).toBe(Math.floor((validTo - NOW) / DAY));
    expect(cert?.renewal_due_at).toBe(new Date(validTo - 10 * DAY).toISOString());
    expect(cert?.valid_from).toBe(new Date(new X509Certificate(RSA_PEM).validFrom).toISOString());
    expect(cert?.fingerprint_sha256).toBe(new X509Certificate(RSA_PEM).fingerprint256);
    expect(cert?.serial_number).toBe(new X509Certificate(RSA_PEM).serialNumber);
  });

  it('flags an EC certificate with several DNS names as MULTI and ignores IP SANs', () => {
    const cert = toCertificate('multi', EC_PEM, 'server = https://acme-staging-v02.api.letsencrypt.org/directory', NOW);
    expect(cert).toMatchObject({
      domains: ['multi.example.com', 'www.multi.example.com'],
      coverage: 'MULTI',
      key_type: expect.stringMatching(/^ECDSA /),
      issuer: 'multi.example.com',
      production_ca: false,
      authenticator: null,
    });
  });

  it('flags a wildcard, falls back to the issuer CN and reports no common name', () => {
    const cert = toCertificate('wild', ED_PEM, '', NOW);
    expect(cert).toMatchObject({ coverage: 'WILDCARD', common_name: null, key_type: 'ED25519', issuer: 'NoCN', production_ca: true });
  });

  it('has no domains for a certificate without a SAN', () => {
    const cert = toCertificate('nosan', NOSAN_PEM, '', NOW);
    expect(cert).toMatchObject({ domains: [], coverage: 'SINGLE', common_name: 'nosan.example.com', issuer: 'nosan.example.com' });
  });

  it('defaults renewal to thirty days for a missing, junk or non-positive renew_before_expiry', () => {
    const validTo = new Date(new X509Certificate(RSA_PEM).validTo).getTime();
    const expected = new Date(validTo - 30 * DAY).toISOString();
    for (const conf of ['', 'renew_before_expiry = soon', 'renew_before_expiry = 0 days', 'renew_before_expiry =']) {
      expect(toCertificate('x', RSA_PEM, conf, NOW)?.renewal_due_at).toBe(expected);
    }
  });

  it('returns null when the PEM does not parse', () => {
    expect(toCertificate('bad', 'not a pem', '', NOW)).toBeNull();
  });

  it('defaults "now" to the current time', () => {
    jest.useFakeTimers().setSystemTime(NOW);
    const cert = toCertificate('single', RSA_PEM, '');
    jest.useRealTimers();
    expect(cert?.days_remaining).toBe(Math.floor((Date.parse(new X509Certificate(RSA_PEM).validTo) - NOW) / DAY));
  });

  describe('when node reports no key details', () => {
    afterEach(() => jest.restoreAllMocks());
    const spyKey = (key: unknown) =>
      jest.spyOn(X509Certificate.prototype, 'publicKey', 'get').mockReturnValue(key as never);

    it('prints a bare RSA label', () => {
      spyKey({ asymmetricKeyType: 'rsa', asymmetricKeyDetails: undefined });
      expect(toCertificate('x', RSA_PEM, '', NOW)?.key_type).toBe('RSA');
    });

    it('prints a bare ECDSA label', () => {
      spyKey({ asymmetricKeyType: 'ec', asymmetricKeyDetails: undefined });
      expect(toCertificate('x', EC_PEM, '', NOW)?.key_type).toBe('ECDSA');
    });

    it('prints unknown for an unidentified key type', () => {
      spyKey({ asymmetricKeyType: undefined });
      expect(toCertificate('x', EC_PEM, '', NOW)?.key_type).toBe('UNKNOWN');
    });
  });
});

describe('parseCertbotDump', () => {
  const block = (name: string, pem: string, conf = 'authenticator = webroot\n') =>
    `${CERT_MARK}${name}\n${pem}${CONF_MARK}\n${conf}${END_MARK}\n`;

  it('lists every readable lineage with its conf, soonest expiry first', () => {
    const out = parseCertbotDump(block('late', RSA_PEM) + block('early', NOSAN_PEM), NOW);
    expect(out.map((c) => c.name)).toEqual(['early', 'late']);
    expect(out[0].days_remaining).toBeLessThan(out[1].days_remaining);
    expect(out[1].authenticator).toBe('webroot');
  });

  it('skips lineages with no name, no conf marker, an end before the conf, or a broken PEM', () => {
    const dump = [
      `${CERT_MARK}\n${RSA_PEM}${CONF_MARK}\n${END_MARK}\n`,
      `${CERT_MARK}noconf\n${RSA_PEM}${END_MARK}\n`,
      `${CERT_MARK}early-end\n${RSA_PEM}${END_MARK}\n${CONF_MARK}\n`,
      block('broken', 'garbage\n'),
      block('good', RSA_PEM),
    ].join('');
    expect(parseCertbotDump(dump, NOW).map((c) => c.name)).toEqual(['good']);
  });

  it('returns nothing for an empty dump and uses the current time by default', () => {
    expect(parseCertbotDump('')).toEqual([]);
    jest.useFakeTimers().setSystemTime(NOW);
    const [only] = parseCertbotDump(block('a', RSA_PEM));
    jest.useRealTimers();
    expect(only.days_remaining).toBe(Math.floor((Date.parse(new X509Certificate(RSA_PEM).validTo) - NOW) / DAY));
  });
});
