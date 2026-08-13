import { PORTAL_ROLE_REQUIREMENTS } from '@modules/portals/portal.constants';
import type { SurfaceHost } from './askBot.links';

/**
 * Every Duncit surface the navigation bot can send someone to.
 *
 * `key` matches the frontend's own `appConfig.key` (and so the keys in
 * PORTAL_ROLE_REQUIREMENTS / PORTAL_REGISTRY); `host` and `dev_port` are the
 * addresses from `deploy/nginx/duncit.com` and each app's vite/astro config, so
 * a link resolves in whichever environment asked for it.
 *
 * The roles are NOT restated here — they are read from the login gate's own map,
 * which is the thing that actually decides, so the bot can never tell someone
 * they have access to a console the gate then turns them away from.
 */
export type SurfaceKind = 'PORTAL' | 'APP' | 'WEBSITE';

export interface Surface extends SurfaceHost {
  key: string;
  name: string;
  kind: SurfaceKind;
  /** One sentence: what this surface is for, and who works in it. */
  summary: string;
}

export const SURFACES: readonly Surface[] = [
  // ---- Staff consoles -----------------------------------------------------
  {
    key: 'admin',
    name: 'Admin',
    kind: 'PORTAL',
    host: 'admin.duncit.com',
    dev_port: 2002,
    summary:
      'The platform control room: users, roles, clubs, pods, venues, hosts, categories, cities, settings, localization and the approval inboxes.',
  },
  {
    key: 'tech',
    name: 'Tech',
    kind: 'PORTAL',
    host: 'tech.duncit.com',
    dev_port: 2009,
    summary:
      'Platform plumbing: environment variables, feature flags, maintenance mode, email templates and logs, telemetry, server/Docker operations and app builds.',
  },
  {
    key: 'finance',
    name: 'Finance',
    kind: 'PORTAL',
    host: 'finance.duncit.com',
    dev_port: 2008,
    summary:
      'Money: payments, refunds, settlements, wallets, coins, coupons, expenses, invoices and payout approvals.',
  },
  {
    key: 'support',
    name: 'Support',
    kind: 'PORTAL',
    host: 'support.duncit.com',
    dev_port: 2010,
    summary: 'Tickets, live support chat, grievances, FAQs and account-health follow-ups.',
  },
  {
    key: 'crm',
    name: 'CRM',
    kind: 'PORTAL',
    host: 'crm.duncit.com',
    dev_port: 2007,
    summary:
      'Leads and outreach: calls, WhatsApp campaigns, email templates, reminders, surveys and the sales pipeline.',
  },
  {
    key: 'ads',
    name: 'Ads',
    kind: 'PORTAL',
    host: 'ads-portal.duncit.com',
    dev_port: 2006,
    summary: 'Advertiser accounts, ad campaigns, creatives, placements and ad performance.',
  },
  {
    key: 'marketing',
    name: 'Marketing',
    kind: 'PORTAL',
    host: 'marketing.duncit.com',
    dev_port: 2015,
    summary: 'Campaigns, newsletters, short links, attribution and marketing content.',
  },
  {
    key: 'website-app',
    name: 'Website Console',
    kind: 'PORTAL',
    host: 'website.duncit.com',
    dev_port: 2011,
    summary: 'The content behind duncit.com: pages, navigation, blog, newsroom, careers and policies.',
  },
  {
    key: 'legal',
    name: 'Legal',
    kind: 'PORTAL',
    host: 'legal.duncit.com',
    dev_port: 2012,
    summary: 'Legal documents, contracts, policies and grievance records.',
  },
  {
    key: 'ai',
    name: 'AI',
    kind: 'PORTAL',
    host: 'ai.duncit.com',
    dev_port: 2013,
    summary: 'The AI prompt library and the AI features the platform runs on.',
  },
  {
    key: 'products',
    name: 'Products',
    kind: 'PORTAL',
    host: 'products.duncit.com',
    dev_port: 2014,
    summary: 'The shop catalogue: brands, products, variants, inventory, orders and product moderation.',
  },
  {
    key: 'onboarding',
    name: 'Onboarding',
    kind: 'PORTAL',
    host: 'onboarding.duncit.com',
    dev_port: 2016,
    summary: 'Partner onboarding: host, venue, brand and club applications, meetings and verification.',
  },
  {
    key: 'hr',
    name: 'HR',
    kind: 'PORTAL',
    host: 'hr.duncit.com',
    dev_port: 2017,
    summary: 'People operations: jobs, applicants, employees, attendance and leave.',
  },
  {
    key: 'employee',
    name: 'Employee',
    kind: 'PORTAL',
    host: 'employee.duncit.com',
    dev_port: 2018,
    summary: "An employee's own console: profile, attendance, leave and payslips.",
  },
  {
    key: 'partners',
    name: 'Partners App',
    kind: 'PORTAL',
    host: 'partners-app.duncit.com',
    dev_port: 2005,
    summary:
      'Where hosts, venues, e-commerce brands and club admins run their own business with Duncit.',
  },
  {
    key: 'challenge',
    name: 'Challenges',
    kind: 'PORTAL',
    host: 'challenge.duncit.com',
    dev_port: 2026,
    summary: 'Challenges, their entries and the leaderboards they feed.',
  },
  {
    key: 'developers',
    name: 'Developers',
    kind: 'PORTAL',
    host: 'developers.duncit.com',
    dev_port: 2027,
    summary: 'API keys, webhooks and the public API documentation.',
  },

  // ---- Member apps --------------------------------------------------------
  {
    key: 'mweb',
    name: 'mWeb (member web app)',
    kind: 'APP',
    host: 'mweb.duncit.com',
    dev_port: 2003,
    summary:
      'What members use in a browser: discover and join pods, clubs, the shop, wallet, coins, profile and support.',
  },
  {
    key: 'app',
    name: 'Duncit mobile app',
    kind: 'APP',
    // The app's deep links ARE mWeb URLs — the OS hands a verified
    // mweb.duncit.com link to the app when it is installed (see dev.md), so a
    // link the bot gives opens the screen either way.
    host: 'mweb.duncit.com',
    dev_port: 0,
    summary:
      'The Android/iOS app. Screen-for-screen identical to mWeb, and an mweb.duncit.com link opens the matching screen in the app when it is installed.',
  },

  // ---- Public websites ----------------------------------------------------
  {
    key: 'website',
    name: 'duncit.com (main website)',
    kind: 'WEBSITE',
    host: 'duncit.com',
    dev_port: 2000,
    summary: 'The public marketing site: what Duncit is, safety, policies, careers, help and contact.',
  },
  {
    key: 'partners-website',
    name: 'Partners website',
    kind: 'WEBSITE',
    host: 'partners.duncit.com',
    dev_port: 2004,
    summary: 'The public pitch to hosts, venues and brands, and the way in to the Partners App.',
  },
  {
    key: 'earnwith-website',
    name: 'Earn with Duncit',
    kind: 'WEBSITE',
    host: 'earnwith.duncit.com',
    dev_port: 2025,
    summary: 'The public landing page for earning with Duncit.',
  },
  {
    key: 'ads-website',
    name: 'Advertise with Duncit',
    kind: 'WEBSITE',
    host: 'ads.duncit.com',
    dev_port: 2020,
    summary: 'The public landing page for advertisers, separate from the Ads console.',
  },
];

export const SURFACE_BY_KEY: ReadonlyMap<string, Surface> = new Map(
  SURFACES.map((surface) => [surface.key, surface])
);

/** The roles that open a console, from the login gate's own map. */
export const surfaceRoles = (key: string): readonly string[] => PORTAL_ROLE_REQUIREMENTS[key] ?? [];
