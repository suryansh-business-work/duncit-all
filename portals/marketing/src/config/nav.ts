import type { AppNavItem } from '@duncit/shell';

/**
 * The sidebar, grouped by what a marketer is doing: connecting networks,
 * planning what goes out, finding leads, running campaigns and their channels,
 * reading results, and the keys it all runs on.
 *
 * Every label is the shared catalogue's key; the shell always renders
 * `labelKey`, so the key stands in for the required `label` rather than
 * pinning English here. Sections are added as their pages land — nothing is
 * listed that does not exist yet.
 */
const leaf = (key: string, to: string, icon: string): AppNavItem => ({ label: key, labelKey: key, to, icon });
const group = (key: string, icon: string, children: AppNavItem[]): AppNavItem => ({ label: key, labelKey: key, icon, children });

// The dashboard, then what is waiting on a person, then the record of every run.
const OVERVIEW = group('shell.nav.overview', 'dashboard', [
  leaf('shell.nav.dashboard', '/', 'dashboard'),
  leaf('shell.nav.myTasks', '/tasks', 'survey'),
  leaf('shell.nav.approvals', '/approvals', 'rule'),
  leaf('shell.nav.activity', '/activity', 'timeline'),
]);

const SOCIAL = group('shell.nav.socialMedia', 'hub', [leaf('shell.nav.accounts', '/social/accounts', 'hub')]);

const PUBLISHING = group('shell.nav.publishing', 'calendar', [leaf('shell.nav.calendar', '/publish/calendar', 'calendar')]);

// What is made here before it is published: reels cut by chat from Drive footage.
const CREATE = group('shell.nav.create', 'movie', [leaf('shell.nav.reelStudio', '/studio/reels', 'movie')]);

// The one pipeline every source feeds comes first; the Instagram search is one way into it.
const LEADS = group('shell.nav.leads', 'handshake', [
  leaf('shell.nav.allLeads', '/leads', 'handshake'),
  leaf('shell.nav.instagramLeads', '/leads/instagram', 'handshake'),
]);

// What runs on its own: the agents that plan with Claude and act through code.
const AUTOMATION = group('shell.nav.automation', 'ai', [leaf('shell.nav.agents', '/automation/agents', 'ai')]);

// Everything that is sent, published or promoted, and the audience it goes to.
const CAMPAIGNS = group('shell.nav.campaigns', 'campaign', [
  leaf('shell.nav.email', '/campaigns/email', 'email'),
  leaf('shell.nav.targetAudience', '/audience', 'personSearch'),
  leaf('shell.nav.notifications', '/notifications', 'notifications'),
  leaf('shell.nav.appPopups', '/app-popups', 'image'),
  leaf('shell.nav.status', '/status', 'newspaper'),
  leaf('shell.nav.mailPreferences', '/campaigns/mail-preferences', 'markEmailRead'),
  leaf('shell.nav.occasions', '/occasions', 'celebration'),
  leaf('shell.nav.coupons', '/coupons', 'percent'),
  leaf('shell.nav.shortLinks', '/short-links', 'link'),
  leaf('shell.nav.externalLinks', '/external-links', 'language'),
  group('shell.nav.ads', 'campaign', [
    leaf('shell.nav.adsApproval', '/ads-approvals', 'campaign'),
    leaf('shell.nav.liveAds', '/live-ads', 'insights'),
    leaf('shell.nav.adsSettings', '/ads-settings', 'settings'),
  ]),
]);

const ANALYTICS = group('shell.nav.analytics', 'analytics', [
  // Members' phone-book syncs and the invites sent from them — counts only.
  leaf('shell.nav.memberContacts', '/analytics/contacts', 'contacts'),
]);

const SETTINGS = group('shell.nav.settings', 'settings', [leaf('shell.nav.integrations', '/settings/integrations', 'tune')]);

/** The roles that reach Settings and Approvals — keys, app credentials and decisions are a manager's. */
const MANAGER_ROLES = new Set(['SUPER_ADMIN', 'MARKETING_MANAGER']);
const APPROVALS_PATH = '/approvals';

/** The full sidebar, as a marketing manager sees it. */
export const MARKETING_NAV: readonly AppNavItem[] = [OVERVIEW, SOCIAL, PUBLISHING, CREATE, LEADS, AUTOMATION, CAMPAIGNS, ANALYTICS, SETTINGS];

/** The sidebar for one person: sections their roles cannot act on are left out, not greyed. */
export function buildNav(roles: readonly string[]): AppNavItem[] {
  if (roles.some((role) => MANAGER_ROLES.has(role))) return [...MARKETING_NAV];
  // An editor's sends wait on a manager, so the queue of decisions is not theirs to open.
  return MARKETING_NAV.filter((item) => item !== SETTINGS).map((item) =>
    item === OVERVIEW ? { ...item, children: item.children?.filter((child) => child.to !== APPROVALS_PATH) } : item,
  );
}
