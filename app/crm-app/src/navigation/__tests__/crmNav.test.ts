import { portalOrigin } from '@/constants/config';
import { CRM_NAV, moreSections, type NavItem } from '../crmNav';
import { openNavTarget } from '../navTarget';

/** The More tab lists the CRM portal's sidebar; these pin its shape and where each item goes. */

const leaves = (items: readonly NavItem[]): NavItem[] =>
  items.flatMap((item) => (item.children ? leaves(item.children) : [item]));

describe('CRM_NAV — the portal sidebar', () => {
  it('has the portal’s groups in the portal’s order, without the portal’s CRM Mobile App download pages', () => {
    expect(CRM_NAV.map((item) => item.key)).toEqual([
      'dashboard',
      'leads',
      'tools',
      'reminders',
      'data',
      'emailTemplates',
      'aiCallPrompts',
      'settings',
    ]);
  });

  it('gives every page a destination and a shell.nav label, each page once', () => {
    const pages = leaves(CRM_NAV);
    expect(pages).toHaveLength(20);
    for (const page of pages) {
      expect(page.target).toBeDefined();
      expect(page.labelKey).toMatch(/^shell\.nav\./);
    }
    expect(new Set(pages.map((page) => page.key)).size).toBe(pages.length);
  });

  it('sends the five lead pages to their own kind’s lead list', () => {
    const kinds = leaves(CRM_NAV).flatMap((page) =>
      page.target?.type === 'leads' ? [page.target.kind] : [],
    );
    expect(kinds).toEqual([
      'VENUE_LEAD',
      'HOST_LEAD',
      'ECOMM_LEAD',
      'CREATOR_LEAD',
      'COMMUNITY_LEAD',
    ]);
  });
});

describe('moreSections — the More tab', () => {
  const sections = moreSections(CRM_NAV);

  it('puts the top-level pages first untitled, then one titled section per portal group', () => {
    expect(sections.map((section) => section.key)).toEqual([
      'top',
      'leads',
      'tools',
      'data',
      'emailTemplates',
      'aiCallPrompts',
      'settings',
    ]);
    expect(sections[0]?.labelKey).toBeUndefined();
    expect(sections[0]?.items.map((item) => item.key)).toEqual(['dashboard']);
    expect(sections[1]?.labelKey).toBe('shell.nav.leads');
  });

  it('flattens nested groups in order and leaves out pages a bottom tab holds', () => {
    const keys = sections.flatMap((section) => section.items.map((item) => item.key));
    expect(keys).not.toContain('reminders');
    expect(sections.find((section) => section.key === 'data')?.items.map((i) => i.key)).toEqual([
      'servicesOffered',
      'amenities',
      'eventSuitability',
    ]);
    // Every sidebar page but Reminders is reachable from More.
    expect(keys).toHaveLength(leaves(CRM_NAV).length - 1);
  });

  it('drops a group whose every page is a tab, and has no top section without top pages', () => {
    const tabOnly: NavItem[] = [
      {
        key: 'g',
        labelKey: 'shell.nav.tools',
        icon: { set: 'material', name: 'build' },
        children: [
          {
            key: 'r',
            labelKey: 'shell.nav.reminders',
            icon: { set: 'material', name: 'event' },
            target: { type: 'tab', tab: 'Reminders' },
          },
        ],
      },
    ];
    expect(moreSections(tabOnly)).toEqual([]);
  });
});

describe('openNavTarget', () => {
  const item = (key: string) => leaves(CRM_NAV).find((page) => page.key === key) as NavItem;

  it('opens a screen, a tab, a kind of lead or a managed list', () => {
    const nav = { navigate: jest.fn() };
    openNavTarget(nav as never, item('dashboard').target);
    expect(nav.navigate).toHaveBeenLastCalledWith('Dashboard');
    openNavTarget(nav as never, item('reminders').target);
    expect(nav.navigate).toHaveBeenLastCalledWith('Tabs', { screen: 'Reminders' });
    openNavTarget(nav as never, item('creatorLeads').target);
    expect(nav.navigate).toHaveBeenLastCalledWith('LeadList', { kind: 'CREATOR_LEAD' });
    openNavTarget(nav as never, item('amenities').target);
    expect(nav.navigate).toHaveBeenLastCalledWith('ManagedOptions', { group: 'AMENITY' });
    openNavTarget(nav as never, item('templates').target);
    expect(nav.navigate).toHaveBeenLastCalledWith('EmailTemplates');
  });

  it('does nothing for a group, which has no target', () => {
    const nav = { navigate: jest.fn() };
    openNavTarget(nav as never, CRM_NAV[1]?.target);
    expect(nav.navigate).not.toHaveBeenCalled();
  });
});

describe('portalOrigin', () => {
  it('pairs the staging server with the staging portal, anything else with production', () => {
    expect(portalOrigin('https://staging.server.duncit.com')).toBe(
      'https://staging.crm.duncit.com',
    );
    expect(portalOrigin('https://server.duncit.com')).toBe('https://crm.duncit.com');
  });

  it('names another console the same way (the Tech portal, where Twilio is set up)', () => {
    expect(portalOrigin('https://staging.server.duncit.com', 'tech')).toBe(
      'https://staging.tech.duncit.com',
    );
    expect(portalOrigin('https://server.duncit.com', 'tech')).toBe('https://tech.duncit.com');
  });
});
