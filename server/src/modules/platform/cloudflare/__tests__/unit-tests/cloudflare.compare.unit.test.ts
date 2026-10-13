import type { GodaddyRecord } from '@modules/platform/dns/godaddy.gateway';
import { compareZones, toCloudflareRecord, type CloudflareCompareRow } from '../../cloudflare.compare';
import type { CloudflareRecord } from '../../cloudflare.gateway';

const DOMAIN = 'example.com';
const gd = (over: Partial<GodaddyRecord> & Pick<GodaddyRecord, 'type' | 'name' | 'data'>): GodaddyRecord => ({ ttl: 600, ...over });
const cf = (over: Partial<CloudflareRecord> & Pick<CloudflareRecord, 'type' | 'name' | 'content'>): CloudflareRecord => ({
  id: `cf-${over.type}-${over.name}`,
  ttl: 300,
  ...over,
});

describe('compareZones pairing', () => {
  it('pairs equal records across spelling differences and counts the buckets', () => {
    const result = compareZones(
      [
        gd({ type: 'A', name: 'WWW', data: '1.2.3.4' }),
        gd({ type: 'TXT', name: '@', data: 'v=spf1 -all' }),
        gd({ type: 'CNAME', name: 'apex', data: '@' }),
        gd({ type: 'MX', name: '@', data: 'Mail.Example.com.', priority: 10 }),
        gd({ type: 'A', name: 'only-gd', data: '9.9.9.9' }),
      ],
      [
        cf({ type: 'A', name: 'www.example.com', content: '1.2.3.4' }),
        cf({ type: 'TXT', name: 'example.com', content: '"v=spf1 -all"' }),
        cf({ type: 'CNAME', name: 'apex.example.com', content: 'example.com' }),
        cf({ type: 'MX', name: 'example.com.', content: 'mail.example.com', priority: 10 }),
        cf({ type: 'A', name: 'only-cf.example.com', content: '8.8.8.8', proxied: true }),
      ],
      DOMAIN
    );
    expect(result).toMatchObject({ matched: 4, godaddy_only: 1, cloudflare_only: 1 });
    const only = result.rows.find((r) => r.state === 'CLOUDFLARE_ONLY');
    expect(only).toMatchObject({ name: 'only-cf', proxied: true, copyable: false, source: null });
    const gdOnly = result.rows.find((r) => r.state === 'GODADDY_ONLY');
    expect(gdOnly).toMatchObject({ name: 'only-gd', copyable: true, proxied: null, cloudflare_id: null });
  });

  it('treats a different MX priority or value as a different record', () => {
    const result = compareZones(
      [gd({ type: 'MX', name: '@', data: 'mx1.example.com', priority: 10 })],
      [cf({ type: 'MX', name: 'example.com', content: 'mx1.example.com', priority: 20 })],
      DOMAIN
    );
    expect(result).toMatchObject({ matched: 0, godaddy_only: 1, cloudflare_only: 1 });
  });

  it('ignores priority on types that do not carry one', () => {
    const result = compareZones(
      [gd({ type: 'A', name: 'a', data: '1.1.1.1', priority: 5 })],
      [cf({ type: 'A', name: 'a.example.com', content: '1.1.1.1', priority: 7 })],
      DOMAIN
    );
    expect(result.matched).toBe(1);
    expect(result.rows[0].priority).toBeNull();
  });

  it('joins TXT chunks and unquotes them before comparing; unquoted values are kept as is', () => {
    const result = compareZones(
      [gd({ type: 'TXT', name: 'k', data: 'abcdef' }), gd({ type: 'TXT', name: 'plain', data: ' hello ' })],
      [cf({ type: 'TXT', name: 'k.example.com', content: '"abc" "def"' }), cf({ type: 'TXT', name: 'plain.example.com', content: 'hello' })],
      DOMAIN
    );
    expect(result.matched).toBe(2);
  });

  it('skips SOA and the apex NS but keeps NS records for sub-names', () => {
    const result = compareZones(
      [
        gd({ type: 'SOA', name: '@', data: 'ns.example.com' }),
        gd({ type: 'NS', name: '@', data: 'ns1.godaddy.com' }),
        gd({ type: 'NS', name: 'sub', data: 'ns1.other.com.' }),
      ],
      [
        cf({ type: 'NS', name: 'example.com', content: 'ada.ns.cloudflare.com' }),
        cf({ type: 'SOA', name: 'example.com', content: 'soa' }),
        cf({ type: 'NS', name: 'sub.example.com', content: 'NS1.other.com' }),
      ],
      DOMAIN
    );
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({ type: 'NS', name: 'sub', state: 'BOTH' });
  });

  it('matches SRV records whose service and protocol live in separate GoDaddy fields', () => {
    const result = compareZones(
      [
        gd({ type: 'SRV', name: '@', data: 'sip.example.com', service: '_sip', protocol: 'tcp', port: 5060, weight: 5, priority: 10 }),
        gd({ type: 'SRV', name: 'eu', data: 'sip.eu.example.com', service: 'sip', protocol: '_udp' }),
      ],
      [
        cf({ type: 'SRV', name: '_sip._tcp.example.com', content: '', data: { priority: 10, weight: 5, port: 5060, target: 'sip.example.com' } }),
        cf({ type: 'SRV', name: '_sip._udp.eu.example.com', content: '', data: { target: 'sip.eu.example.com' } }),
      ],
      DOMAIN
    );
    expect(result.matched).toBe(2);
    expect(result.rows.find((r) => r.name === '_sip._udp.eu')?.state).toBe('BOTH');
    expect(result.rows.find((r) => r.name === '_sip._tcp')?.godaddy_value).toBe('5 5060 sip.example.com');
  });

  it('falls back to underscored empty labels for an SRV without service or protocol', () => {
    const [row] = compareZones([gd({ type: 'SRV', name: 'x', data: 't.example.com' })], [], DOMAIN).rows;
    expect(row.name).toBe('_._.x');
    expect(row.godaddy_value).toBe('0 0 t.example.com');
  });

  it('matches CAA records and renders structured Cloudflare data like GoDaddy', () => {
    const result = compareZones(
      [gd({ type: 'CAA', name: '@', data: '0 issue "letsencrypt.org"' })],
      [cf({ type: 'CAA', name: 'example.com', content: '', data: { flags: 0, tag: 'issue', value: 'letsencrypt.org' } })],
      DOMAIN
    );
    expect(result.matched).toBe(1);
    expect(result.rows[0].cloudflare_value).toBe('0 issue "letsencrypt.org"');
  });

  it('renders incomplete CAA data with defaults and uses content when no data is structured', () => {
    const result = compareZones(
      [],
      [
        cf({ type: 'CAA', name: 'a.example.com', content: '', data: { tag: 'iodef' } }),
        cf({ type: 'CAA', name: 'b.example.com', content: '0 issue "x"' }),
        cf({ type: 'SRV', name: '_a._tcp.example.com', content: 'raw' }),
        cf({ type: 'SRV', name: '_b._tcp.example.com', content: '', data: { target: 't' } }),
      ],
      DOMAIN
    );
    const by = (name: string) => result.rows.find((r) => r.name === name)?.cloudflare_value;
    expect(by('a')).toBe('0 iodef ""');
    expect(by('b')).toBe('0 issue "x"');
    expect(by('_a._tcp')).toBe('raw');
    expect(by('_b._tcp')).toBe('0 0 t');
  });

  it('keeps names outside the zone as they are and defaults proxied to false', () => {
    const [row] = compareZones([], [cf({ type: 'CNAME', name: 'Other.Net.', content: 'x.example.com' })], DOMAIN).rows;
    expect(row).toMatchObject({ name: 'other.net', proxied: false, host: 'other.net.example.com' });
  });

  it('sorts rows by host and then by type, so a host records sit together', () => {
    const { rows } = compareZones(
      [
        gd({ type: 'TXT', name: 'b', data: 't' }),
        gd({ type: 'A', name: 'b', data: '1.1.1.1' }),
        gd({ type: 'A', name: '@', data: '2.2.2.2' }),
        gd({ type: 'A', name: 'a', data: '3.3.3.3' }),
      ],
      [],
      DOMAIN
    );
    expect(rows.map((r) => `${r.host}:${r.type}`)).toEqual([
      'a.example.com:A',
      'b.example.com:A',
      'b.example.com:TXT',
      'example.com:A',
    ]);
  });

  it('marks types outside the writable set as not copyable', () => {
    const [row] = compareZones([gd({ type: 'HTTPS', name: 'h', data: '1 .' })], [], DOMAIN).rows;
    expect(row).toMatchObject({ state: 'GODADDY_ONLY', copyable: false });
  });
});

describe('toCloudflareRecord', () => {
  const rowFor = (record: GodaddyRecord): CloudflareCompareRow => compareZones([record], [], DOMAIN).rows[0];

  it('refuses a row with no GoDaddy source', () => {
    const [row] = compareZones([], [cf({ type: 'A', name: 'x.example.com', content: '1.1.1.1' })], DOMAIN).rows;
    expect(() => toCloudflareRecord(row)).toThrow('x.example.com has no GoDaddy record to copy.');
  });

  it('writes A and CNAME records DNS-only with the TTL clamped to Cloudflare limits', () => {
    expect(toCloudflareRecord(rowFor(gd({ type: 'A', name: 'a', data: '1.1.1.1', ttl: 1 })))).toMatchObject({
      type: 'A',
      name: 'a.example.com',
      content: '1.1.1.1',
      ttl: 60,
      proxied: false,
    });
    expect(toCloudflareRecord(rowFor(gd({ type: 'CNAME', name: 'c', data: 'x.example.net', ttl: 604800 })))).toMatchObject({
      ttl: 86400,
      proxied: false,
    });
    expect(toCloudflareRecord(rowFor(gd({ type: 'A', name: 'k', data: '1.1.1.1', ttl: 3600 }))).ttl).toBe(3600);
  });

  it('does not set proxied on non-proxiable types and keeps the audit comment', () => {
    const rec = toCloudflareRecord(rowFor(gd({ type: 'TXT', name: 't', data: 'hello' })));
    expect(rec).not.toHaveProperty('proxied');
    expect(rec).toMatchObject({ content: 'hello', comment: expect.stringContaining('Copied from GoDaddy') });
  });

  it('sends the apex CNAME target as the domain', () => {
    expect(toCloudflareRecord(rowFor(gd({ type: 'CNAME', name: 'www', data: '@' }))).content).toBe(DOMAIN);
  });

  it('copies MX with its priority, defaulting to 0', () => {
    expect(toCloudflareRecord(rowFor(gd({ type: 'MX', name: '@', data: 'mx.example.com', priority: 5 })))).toMatchObject({
      content: 'mx.example.com',
      priority: 5,
    });
    expect(toCloudflareRecord(rowFor(gd({ type: 'MX', name: '@', data: 'mx.example.com' }))).priority).toBe(0);
  });

  it('copies SRV as structured data with the target undotted', () => {
    const rec = toCloudflareRecord(
      rowFor(gd({ type: 'SRV', name: '@', data: 'sip.example.com.', service: '_sip', protocol: '_tcp', port: 5060, weight: 2, priority: 1 }))
    );
    expect(rec.data).toEqual({ priority: 1, weight: 2, port: 5060, target: 'sip.example.com' });
    expect(rec.name).toBe('_sip._tcp.example.com');
    const bare = toCloudflareRecord(rowFor(gd({ type: 'SRV', name: '@', data: 't.', service: '_s', protocol: '_p' })));
    expect(bare.data).toEqual({ priority: 0, weight: 0, port: 0, target: 't' });
  });

  it('copies CAA as flags, tag and an unquoted value', () => {
    const rec = toCloudflareRecord(rowFor(gd({ type: 'CAA', name: '@', data: '128 issue "letsencrypt.org"' })));
    expect(rec.data).toEqual({ flags: 128, tag: 'issue', value: 'letsencrypt.org' });
  });

  it('rejects a malformed CAA value', () => {
    for (const data of ['issue "x"', '0 issue', '']) {
      expect(() => toCloudflareRecord(rowFor(gd({ type: 'CAA', name: '@', data })))).toThrow('is not "flags tag value"');
    }
  });

});
