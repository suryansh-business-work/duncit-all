import { crmResolvers } from '../../crm.resolver';
import { cleanSocialLinks, normaliseLeadInput, pub } from '../../crm.service';
import { makeContext } from '@test/harness';

describe('cleanSocialLinks', () => {
  it('reads anything but a list as no links', () => {
    expect(cleanSocialLinks(undefined)).toEqual([]);
    expect(cleanSocialLinks(null)).toEqual([]);
    expect(cleanSocialLinks('https://x.com/a')).toEqual([]);
    expect(cleanSocialLinks({ url: 'https://x.com/a' })).toEqual([]);
  });

  it('drops rows without a URL, including null rows and bare strings', () => {
    expect(cleanSocialLinks([null, {}, { name: 'Blank', url: '  ' }, 'https://x.com/a', { url: 'https://x.com/b' }])).toEqual([
      { name: 'x.com', url: 'https://x.com/b' },
    ]);
  });

  it('trims the name to 60 characters and names a nameless link after its host without www', () => {
    expect(
      cleanSocialLinks([
        { name: ` ${'n'.repeat(70)} `, url: 'https://a.example/p' },
        { name: '   ', url: 'https://www.behance.net/studio' },
        { name: 42, url: 'HTTPS://Sub.Example.com/x' },
      ])
    ).toEqual([
      { name: 'n'.repeat(60), url: 'https://a.example/p' },
      { name: 'behance.net', url: 'https://www.behance.net/studio' },
      { name: '42', url: 'HTTPS://Sub.Example.com/x' },
    ]);
  });

  it('keeps at most 20 links', () => {
    const rows = Array.from({ length: 25 }, (_, i) => ({ name: `L${i}`, url: `https://links.example/${i}` }));
    const out = cleanSocialLinks(rows);
    expect(out).toHaveLength(20);
    expect(out[19]).toEqual({ name: 'L19', url: 'https://links.example/19' });
  });

  it.each(['javascript:alert(1)', 'JavaScript:alert(1)', 'mailto:a@b.com', 'www.instagram.com/a', 'ftp://a.example'])(
    'refuses %p as a bad input',
    (url) => {
      expect(() => cleanSocialLinks([{ name: 'x', url }])).toThrow(`"${url}" is not a web link`);
    }
  );

  it('is read back by pub as name/url pairs, blank for a malformed stored row, and empty when never set', () => {
    expect(pub({ _id: 'a', social_links: [{ name: 'X', url: 'https://x.com/a', _id: 'sub' }, null, {}] })!.social_links).toEqual([
      { name: 'X', url: 'https://x.com/a' },
      { name: '', url: '' },
      { name: '', url: '' },
    ]);
    expect(pub({ _id: 'b' })!.social_links).toEqual([]);
  });

  it('is applied by normaliseLeadInput only when social_links is sent', () => {
    expect(normaliseLeadInput({ venue_name: 'A' })).toEqual({ venue_name: 'A' });
    expect(normaliseLeadInput({ social_links: null })).toEqual({ social_links: [] });
    expect(normaliseLeadInput({ social_links: [{ url: 'https://x.com/a' }] })).toEqual({
      social_links: [{ name: 'x.com', url: 'https://x.com/a' }],
    });
  });
});

describe('crm unit', () => {
  it('venueLeads query is gated to CRM roles', async () => {
    await expect(
      (async () => (crmResolvers.Query as any).venueLeads({}, { filter: {} }, makeContext({ roles: ['USER'] })))()
    ).rejects.toThrow(/access denied/i);
  });

  it('hostLeads query is gated to CRM roles', async () => {
    await expect(
      (async () => (crmResolvers.Query as any).hostLeads({}, { filter: {} }, makeContext({ roles: ['USER'] })))()
    ).rejects.toThrow(/access denied/i);
  });
});
