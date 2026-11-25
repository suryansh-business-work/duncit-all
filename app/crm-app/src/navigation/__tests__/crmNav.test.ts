import { portalOrigin } from '@/constants/config';
import { CRM_NAV, findNavKey, navPath, type NavItem } from '../crmNav';
import { activeNavKey, goTo } from '@/screens/menu/menuRoutes';

/** The side menu is the CRM portal's sidebar; these pin its shape and where each item goes. */

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

  it('finds an item and the groups on the way to it', () => {
    expect(findNavKey(CRM_NAV, (t) => t.type === 'options' && t.group === 'AMENITY')).toBe(
      'amenities',
    );
    expect(navPath(CRM_NAV, 'amenities')).toEqual(['data', 'venues']);
    expect(navPath(CRM_NAV, 'dashboard')).toEqual([]);
    expect(navPath(CRM_NAV, 'nope')).toBeNull();
    expect(findNavKey(CRM_NAV, () => false)).toBeNull();
  });
});

describe('activeNavKey — "you are here"', () => {
  const tabs = (name: string, params?: object) => ({
    name: 'Tabs',
    state: { index: 0, routes: [{ name, params }] },
  });

  it('marks a page by its screen, a lead page by its kind, and Reminders', () => {
    expect(activeNavKey({ name: 'EmailTemplates' })).toBe('templates');
    expect(activeNavKey({ name: 'WhatsAppGenerator' })).toBe('whatsappLeadGenerator');
    expect(activeNavKey({ name: 'DynamicFields' })).toBe('dynamicFields');
    expect(activeNavKey({ name: 'LeadQualitySettings' })).toBe('leadQualityScore');
    expect(activeNavKey({ name: 'LeadList', params: { kind: 'VENUE_LEAD' } })).toBe('venueLeads');
    expect(activeNavKey({ name: 'CallPrompts' })).toBe('staticContent');
    expect(activeNavKey(tabs('Leads', { kind: 'HOST_LEAD' }))).toBe('hostLeads');
    expect(activeNavKey(tabs('Reminders'))).toBe('reminders');
    expect(activeNavKey({ name: 'Dashboard' })).toBe('dashboard');
    expect(activeNavKey({ name: 'UserLeads' })).toBe('whatsappLeads');
    expect(activeNavKey({ name: 'ManagedOptions', params: { group: 'EVENT_SUITABILITY' } })).toBe(
      'eventSuitability',
    );
  });

  it('marks nothing for screens the portal has no page for, or an unfiltered lead list', () => {
    expect(activeNavKey(undefined)).toBeNull();
    expect(activeNavKey({ name: 'LeadDetail' })).toBeNull();
    expect(activeNavKey(tabs('Dialer'))).toBeNull();
    expect(activeNavKey(tabs('Leads'))).toBeNull();
    expect(activeNavKey({ name: 'Tabs', state: { routes: [] } })).toBeNull();
  });
});

describe('goTo', () => {
  const navigation = () => ({ goBack: jest.fn(), navigate: jest.fn() });
  const item = (key: string) => leaves(CRM_NAV).find((page) => page.key === key) as NavItem;

  it('closes the menu, then opens a screen, a tab, a kind of lead or a managed list', () => {
    const nav = navigation();
    goTo(nav as never, item('dashboard'));
    expect(nav.navigate).toHaveBeenLastCalledWith('Dashboard');
    goTo(nav as never, item('reminders'));
    expect(nav.goBack).toHaveBeenCalled();
    expect(nav.navigate).toHaveBeenLastCalledWith('Tabs', { screen: 'Reminders' });
    goTo(nav as never, item('creatorLeads'));
    expect(nav.navigate).toHaveBeenLastCalledWith('LeadList', { kind: 'CREATOR_LEAD' });
    goTo(nav as never, item('amenities'));
    expect(nav.navigate).toHaveBeenLastCalledWith('ManagedOptions', { group: 'AMENITY' });
    goTo(nav as never, item('templates'));
    expect(nav.navigate).toHaveBeenLastCalledWith('EmailTemplates');
  });

  it('does nothing for a group', () => {
    const nav = navigation();
    goTo(nav as never, CRM_NAV[1] as NavItem);
    expect(nav.goBack).not.toHaveBeenCalled();
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
