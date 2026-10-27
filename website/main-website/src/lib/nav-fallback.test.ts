import { describe, expect, it } from 'vitest';
import { navFallback } from './nav-fallback';

const t = (key: string) => `T:${key}`;

describe('navFallback', () => {
  it('returns the four groups in header order, each with an icon and translated labels', () => {
    const groups = navFallback(t);
    expect(groups.map((g) => g.label)).toEqual([
      'T:website.main.nav.about',
      'T:website.main.nav.community',
      'T:website.main.nav.safetyHub',
      'T:website.main.nav.support',
    ]);
    expect(groups.map((g) => g.icon)).toEqual(['fa-circle-info', 'fa-people-group', 'fa-shield-heart', 'fa-life-ring']);
  });

  it('builds header links with the site paths and translated labels', () => {
    const [about, community, safety] = navFallback(t);
    expect(about.links.map((l) => [l.id, l.url, l.label])).toEqual([
      ['n-about', '/about', 'T:website.main.nav.aboutUs'],
      ['n-newsroom', '/newsroom', 'T:website.main.nav.newsroom'],
      ['n-careers', '/careers', 'T:website.main.nav.careers'],
      ['n-contact', '/contact', 'T:website.main.nav.contactUs'],
    ]);
    expect(community.links.map((l) => l.url)).toEqual(['/community', '/guidelines', '/blog']);
    expect(safety.links.map((l) => l.url)).toEqual(['/safety/approach', '/safety/advice', '/safety/tools', '/safety/resources']);
    for (const l of about.links) expect(l).toMatchObject({ area: 'HEADER', group_label: '', sort_order: 0 });
  });

  it('omits the support mail link when no support email is configured', () => {
    const support = navFallback(t)[3];
    expect(support.links.map((l) => l.id)).toEqual(['n-help', 'n-faq']);
  });

  it('appends a mailto link when a support email is configured', () => {
    const support = navFallback(t, 'help@example.com')[3];
    expect(support.links.map((l) => l.id)).toEqual(['n-help', 'n-faq', 'n-support-mail']);
    expect(support.links[2]).toMatchObject({ url: 'mailto:help@example.com', label: 'T:website.main.nav.emailSupport' });
  });

  it('treats an empty support email as none', () => {
    expect(navFallback(t, '')[3].links).toHaveLength(2);
  });
});
