/// <reference types="cypress" />
import {
  CAPTCHA_BUNDLE,
  createTranslator,
  ECOMM_STORE_BUNDLE,
  flattenCatalogue,
  GRIEVANCE_BUNDLE,
  mergeCatalogues,
  PRIVACY_BUNDLE,
  resolveLocale,
  STATUS_BUNDLE,
  WEBSITE_BUNDLE,
  type FlatCatalogue,
  type Locale,
  type Translator,
} from '@duncit/i18n';
import { formatMoney } from '@duncit/utils';

/**
 * Shared steps for the public website specs under specs/ui/websites/: where
 * each site is served, the cross-site addresses its build baked in, the copy
 * its build rendered, and the few staging reads every spec needs. Nothing here
 * stubs the API — the specs that assert a failure state block one request with
 * `cy.intercept(..., { forceNetworkError: true })`, exactly what the scenario
 * map's "block the request" step describes.
 *
 * Each site is its own origin (localhost:<port>), so a test only ever visits
 * ONE site; links that leave it are asserted by href and target, never followed.
 */

export type SiteKey = 'main' | 'ads' | 'earnwith' | 'partners' | 'status' | 'ecomm' | 'cms';

const SITE_ENV: Record<SiteKey, string> = {
  main: 'MAIN_SITE_URL',
  ads: 'ADS_SITE_URL',
  earnwith: 'EARNWITH_SITE_URL',
  partners: 'PARTNERS_SITE_URL',
  status: 'STATUS_SITE_URL',
  ecomm: 'ECOMM_STORE_URL',
  cms: 'CMS_SITE_URL',
};

const trimSlashes = (url: string): string => url.replace(/\/+$/, '');

/** Where a site is served in this run (cypress.config.ts env). */
export const siteUrl = (site: SiteKey, path = ''): string => `${trimSlashes(String(Cypress.env(SITE_ENV[site])))}${path}`;

/**
 * The public addresses the site builds were made with (PUBLIC_*_URL /
 * VITE_*_URL, websites-workflow.md). Links and canonicals carry these, not the
 * localhost address the page is served from.
 */
export type LinkKey = 'mainSite' | 'mweb' | 'adsSite' | 'adsPortal' | 'earnwith' | 'partnersSite' | 'partnersApp';

const LINK_ENV: Record<LinkKey, string> = {
  mainSite: 'LINK_MAIN_SITE_URL',
  mweb: 'LINK_MWEB_URL',
  adsSite: 'LINK_ADS_SITE_URL',
  adsPortal: 'LINK_ADS_PORTAL_URL',
  earnwith: 'LINK_EARNWITH_URL',
  partnersSite: 'LINK_PARTNERS_SITE_URL',
  partnersApp: 'LINK_PARTNERS_APP_URL',
};

export const linkUrl = (key: LinkKey, path = ''): string => `${trimSlashes(String(Cypress.env(LINK_ENV[key])))}${path}`;

/** The API origin (GRAPHQL_URL without /graphql) — the status page's REST routes live here. */
export const apiOrigin = (): string => String(Cypress.env('GRAPHQL_URL')).replace(/\/graphql\/?$/, '');

/* ------------------------------------------------------------------ */
/* Visiting                                                            */
/* ------------------------------------------------------------------ */

const CONSENT_COOKIE = 'duncit_consent';

export interface VisitOptions {
  /** 'none' leaves the consent banner up; 'reject' (default) answers it first so it covers nothing. */
  consent?: 'none' | 'reject' | 'accept';
  onBeforeLoad?: (win: Cypress.AUTWindow) => void;
  failOnStatusCode?: boolean;
}

/**
 * Visit a page of one site. The consent answer is written as the site's own
 * host-only cookie (localhost is outside .duncit.com, consent.ts) before the
 * page loads, so the fixed banner never sits over the footer under test.
 */
export function visitSite(site: SiteKey, path = '/', options: VisitOptions = {}): Cypress.Chainable<Cypress.AUTWindow> {
  const consent = options.consent ?? 'reject';
  return cy.visit(siteUrl(site, path), {
    failOnStatusCode: options.failOnStatusCode ?? true,
    onBeforeLoad(win) {
      if (consent !== 'none') {
        const allow = consent === 'accept';
        const choice = { analytics: allow, marketing: allow, decided_at: new Date().toISOString() };
        win.document.cookie = `${CONSENT_COOKIE}=${encodeURIComponent(JSON.stringify(choice))}; path=/`;
      }
      options.onBeforeLoad?.(win);
    },
  });
}

/** Desktop width — the satellite sites hide their inline nav below 1024px (`lg`). */
export const useDesktop = (): void => {
  cy.viewport(1280, 900);
};

/**
 * Suite config for a site whose header stays on screen as the page scrolls.
 * duncit.com's top bar (TopBar.astro) is a sticky pill in a zero-height
 * wrapper: Cypress's default scroll puts the target at the very top, under the
 * pill, and the click or keystroke fails as covered (a zero-height wrapper
 * leaves Cypress nothing to scroll past). Centring the target keeps it clear
 * of the bar and of the floating Earn pill at the bottom edge.
 */
export const CENTER_SCROLL: Cypress.SuiteConfigOverrides = { scrollBehavior: 'center' };

/* ------------------------------------------------------------------ */
/* Waiting on the browser's own requests                               */
/* ------------------------------------------------------------------ */

/**
 * How many requests each alias set by interceptQuery / guardMutation has
 * claimed in the running test. Cypress registers an alias given inside a
 * handler (`req.alias`) only once a request carries it, so `cy.get('@x.all')`
 * cannot report zero: with nothing sent it fails with "could not find a
 * registered alias". expectNeverSent reads this count instead.
 */
const claimed = new Map<string, number>();

Cypress.on('test:before:run', () => {
  claimed.clear();
});

const claim = (alias: string): void => {
  claimed.set(alias, (claimed.get(alias) ?? 0) + 1);
};

/**
 * Alias the browser's next GraphQL request whose document contains `fragment`.
 * The Astro widgets post bare `{ query }` bodies with no operationName, so
 * `cy.interceptOperation` cannot see them.
 */
export function interceptQuery(fragment: string, alias: string): void {
  claimed.set(alias, 0);
  cy.intercept({ method: 'POST', url: String(Cypress.env('GRAPHQL_URL')) }, (req) => {
    const body = req.body as { query?: string } | undefined;
    // Newer intercepts run first (Cypress ≥7): a later interceptQuery for the same
    // document claims the request, and the older one leaves its alias alone.
    if (!req.alias && typeof body?.query === 'string' && body.query.includes(fragment)) {
      req.alias = alias;
      claim(alias);
    }
  });
}

/** Make the browser's request for `fragment` fail at the network, as a blocked request does. */
export function blockQuery(fragment: string): void {
  cy.intercept({ method: 'POST', url: String(Cypress.env('GRAPHQL_URL')) }, (req) => {
    const body = req.body as { query?: string } | undefined;
    if (typeof body?.query === 'string' && body.query.includes(fragment)) req.reply({ forceNetworkError: true });
  });
}

/* ------------------------------------------------------------------ */
/* The copy each build rendered                                        */
/* ------------------------------------------------------------------ */

const TRANSLATIONS = `query E2eTranslations($locale: String!) { publicTranslations(locale: $locale) { key value } }`;
const LOCALES = `query E2eLocales { publicLocales { code label is_rtl is_active is_default } }`;

/** The four Astro sites' bundled fallback (@duncit/brand/site-i18n WEBSITE_FALLBACK). */
export const WEBSITE_FALLBACK_FLAT: FlatCatalogue = flattenCatalogue({
  ...WEBSITE_BUNDLE,
  ...GRIEVANCE_BUNDLE,
  ...PRIVACY_BUNDLE,
});

export const STATUS_FALLBACK_FLAT: FlatCatalogue = {
  ...flattenCatalogue(STATUS_BUNDLE),
  ...flattenCatalogue(CAPTCHA_BUNDLE),
};

export const STORE_FALLBACK_FLAT: FlatCatalogue = mergeCatalogues(
  flattenCatalogue(ECOMM_STORE_BUNDLE),
  flattenCatalogue(CAPTCHA_BUNDLE),
);

function serverCatalogue(locale: string): Cypress.Chainable<FlatCatalogue> {
  return cy
    .gql<{ publicTranslations: { key: string; value: string }[] }>(TRANSLATIONS, { locale }, { token: null })
    .then((data) => {
      const server: FlatCatalogue = {};
      for (const row of data.publicTranslations) server[row.key] = row.value;
      return server;
    });
}

/**
 * The translator an Astro site's build used (getSiteTranslator: en-IN server
 * rows over WEBSITE_FALLBACK). Read at spec time, so a copy edit between the
 * build and the run is the only way it can differ.
 */
export function websiteCopy(): Cypress.Chainable<Translator['t']> {
  return serverCatalogue('en-IN').then(
    (server) => createTranslator({ locale: 'en-IN', fallback: WEBSITE_FALLBACK_FLAT, server }).t,
  );
}

/** The status page's translator: the browser language resolved against publicLocales (TranslationProvider.tsx). */
export function statusCopy(): Cypress.Chainable<Translator['t']> {
  return cy.gql<{ publicLocales: Locale[] }>(LOCALES, {}, { token: null }).then((data) => {
    const locale = resolveLocale(globalThis.navigator?.language, data.publicLocales)?.code ?? 'en-IN';
    return serverCatalogue(locale).then(
      (server) => createTranslator({ locale, fallback: STATUS_FALLBACK_FLAT, server }).t,
    );
  });
}

/** The pet store's translator: the visitor's locale over STORE_FALLBACK (src/i18n/index.ts, LocaleProvider). */
export function storeCopy(): Cypress.Chainable<Translator['t']> {
  return cy.gql<{ publicLocales: Locale[] }>(LOCALES, {}, { token: null }).then((data) => {
    const locale = resolveLocale(globalThis.navigator?.language, data.publicLocales)?.code ?? 'en-IN';
    return serverCatalogue(locale).then(
      (server) => createTranslator({ locale, fallback: STORE_FALLBACK_FLAT, server }).t,
    );
  });
}

/** The status page's shipped copy alone — what renders when the translations request fails. */
export const statusFallbackT = createTranslator({ locale: 'en-IN', fallback: STATUS_FALLBACK_FLAT }).t;

/* ------------------------------------------------------------------ */
/* Staging reads                                                       */
/* ------------------------------------------------------------------ */

export interface SitePolicy {
  id: string;
  slug: string;
  title: string;
}

export interface SiteBranding {
  app_name: string;
  support_email: string;
  support_phone: string;
  android_app_url: string;
  ios_app_url: string;
  website_header_logo_url: string;
}

export interface SiteNavLink {
  area: 'HEADER' | 'FOOTER';
  group_label: string;
  label: string;
  url: string;
}

export type NavSite = 'MAIN' | 'PARTNERS' | 'ADS' | 'EARNWITH';

const POLICIES = `query E2eWebsitePolicies { publicPolicies { id slug title } }`;
const BRANDING = `query E2eWebsiteBranding { branding { app_name support_email support_phone android_app_url ios_app_url website_header_logo_url } }`;
const NAV = `query E2eWebsiteNav($site: WebsiteNavSite!) { publicWebsiteNav(site: $site) { area group_label label url } }`;

export const publicPolicies = (): Cypress.Chainable<SitePolicy[]> =>
  cy.gql<{ publicPolicies: SitePolicy[] }>(POLICIES, {}, { token: null }).then((data) => data.publicPolicies);

/** At least one active policy, or the spec stops with what staging is missing. */
export const requirePolicies = (): Cypress.Chainable<SitePolicy[]> =>
  publicPolicies().then((policies) => {
    if (!policies.length) throw new Error('Staging prerequisite: no active policy is published (Legal > Policies).');
    return policies;
  });

/** Branding with the sites' own fallbacks applied (site-data.ts BRANDING_FALLBACK). */
export const siteBranding = (): Cypress.Chainable<SiteBranding> =>
  cy.gql<{ branding: Partial<SiteBranding> | null }>(BRANDING, {}, { token: null }).then((data) => ({
    app_name: data.branding?.app_name || 'Duncit',
    support_email: data.branding?.support_email || 'support@duncit.com',
    support_phone: data.branding?.support_phone || '',
    android_app_url: data.branding?.android_app_url || '',
    ios_app_url: data.branding?.ios_app_url || '',
    website_header_logo_url: data.branding?.website_header_logo_url || '',
  }));

export const siteNav = (site: NavSite, area: 'HEADER' | 'FOOTER'): Cypress.Chainable<SiteNavLink[]> =>
  cy
    .gql<{ publicWebsiteNav: SiteNavLink[] }>(NAV, { site }, { token: null })
    .then((data) => data.publicWebsiteNav.filter((link) => link.area === area));

/* ------------------------------------------------------------------ */
/* The status page's REST reads (website/status-website/src/api.ts)    */
/* ------------------------------------------------------------------ */

export interface StatusService {
  key: string;
  name: string;
  url: string;
  description: string;
  health?: string;
}

export interface StatusGroup {
  title: string;
  items: StatusService[];
}

export type StatusState = 'operational' | 'degraded' | 'partial_outage' | 'major_outage' | 'down' | 'nodata';

export interface StatusDay {
  date: string;
  uptime: number;
  state: Exclude<StatusState, 'down' | 'nodata'>;
}

export interface StatusServiceSummary {
  uptime_24h: number | null;
  uptime_90d: number | null;
  state: StatusState;
  active_incidents: number;
  daily: StatusDay[];
}

export interface StatusSummary {
  overall: { state: StatusState; operational: number; degraded: number; down: number; total: number; uptime_90d: number | null };
  services: Record<string, StatusServiceSummary>;
}

export interface StatusIncident {
  id: string;
  service_name: string;
  title: string;
  body: string;
  impact: 'degraded' | 'partial_outage' | 'major_outage';
  started_at: string;
  resolved_at: string | null;
}

const statusGet = <T>(path: string): Cypress.Chainable<T> =>
  cy.request<T>({ url: `${apiOrigin()}${path}`, log: false }).then((res) => cy.wrap<T>(res.body, { log: false }));

export const statusServices = (): Cypress.Chainable<{ environment: 'production' | 'staging'; groups: StatusGroup[] }> => {
  return statusGet<{ environment: 'production' | 'staging'; groups: StatusGroup[] }>('/status/services').then((body) => {
    if (!body.groups.length) throw new Error('Staging prerequisite: /status/services lists no service groups.');
    return body;
  });
};

export const statusSummary = (): Cypress.Chainable<StatusSummary> => statusGet<StatusSummary>('/status/summary');

export const statusIncidents = (): Cypress.Chainable<StatusIncident[]> =>
  statusGet<{ incidents: StatusIncident[] }>('/status/incidents').then((body) => body.incidents);

/** utils/status.ts labels and utils/format.ts uptime, as the board prints them. */
export const STATE_LABEL: Record<StatusState, string> = {
  operational: 'Operational',
  degraded: 'Degraded',
  partial_outage: 'Partial outage',
  major_outage: 'Major outage',
  down: 'Down',
  nodata: 'No data',
};

export const formatUptime = (pct: number | null | undefined): string =>
  pct === null || pct === undefined ? '—' : `${pct.toFixed(2)}%`;

/** The board's date format (utils/format.ts formatDate) in this browser's locale. */
export const formatStatusDate = (iso: string | null): string => {
  if (!iso) return '—';
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};

/* ------------------------------------------------------------------ */
/* The pet store (ecomm.duncit.com — never the Partner Brand console)  */
/* ------------------------------------------------------------------ */

export interface StoreCard {
  id: string;
  slug: string;
  title: string;
  price: number;
  has_variants: boolean;
  lead_variant_id: string;
  in_stock: boolean;
}

const STORE_SEARCH = `query E2eStoreSearch($input: StoreSearchInput!) {
  storeSearch(input: $input) { total items { id slug title price has_variants lead_variant_id in_stock } }
}`;
const STORE_SETTINGS = `query E2eStoreSettings { storeSettings { store_enabled currency_symbol store_name } }`;

/** The live store settings; a switched-off store fails the spec here, not on every page. */
export const storeSettings = (): Cypress.Chainable<{ currency_symbol: string; store_name: string }> =>
  cy
    .gql<{ storeSettings: { store_enabled: boolean; currency_symbol: string; store_name: string } }>(STORE_SETTINGS, {}, { token: null })
    .then(({ storeSettings: settings }) => {
      if (!settings.store_enabled) throw new Error('Staging prerequisite: the pet store is switched off (Ecomm Portal > Settings), so every route shows the closed page.');
      return cy.wrap({ currency_symbol: settings.currency_symbol, store_name: settings.store_name }, { log: false });
    });

/** One page of the shelf, as /shop asks for it. */
export const storeShelf = (input: Record<string, unknown> = {}): Cypress.Chainable<{ total: number; items: StoreCard[] }> =>
  cy
    .gql<{ storeSearch: { total: number; items: StoreCard[] } }>(STORE_SEARCH, { input: { page: 1, page_size: 24, ...input } }, { token: null })
    .then((data) => data.storeSearch);

/** An in-stock product the shelf lists, matching `pick`, or the spec stops with what staging lacks. */
export function storeProduct(pick: (card: StoreCard) => boolean, need: string): Cypress.Chainable<StoreCard> {
  return storeShelf({ in_stock_only: true, page_size: 60 }).then(({ items }) => {
    const found = items.find(pick);
    if (!found) throw new Error(`Staging prerequisite: the pet store lists no in-stock product ${need} (Ecomm Portal > Products).`);
    return found;
  });
}

/** src/lib/money.ts formatStoreMoney: whole rupees without paise, anything else to two places. */
export const storeMoney = (value: number, symbol: string): string => {
  const amount = Number(value) || 0;
  return formatMoney(amount, { symbol, decimals: Number.isInteger(amount) ? 0 : 2 });
};

/** The pet store's header controls hide below `md`; its specs run at desktop width unless they test the phone. */
export const useStoreDesktop = (): void => {
  cy.viewport(1280, 900);
};

/* ------------------------------------------------------------------ */
/* Assertions                                                          */
/* ------------------------------------------------------------------ */

/** A link that leaves the site: right address, new tab, no opener. */
export function expectNewTab($link: JQuery<HTMLElement>, href: string): void {
  expect($link, `link to ${href}`).to.have.attr('href', href);
  expect($link).to.have.attr('target', '_blank');
  expect($link.attr('rel') ?? '').to.contain('noopener');
}

/** The served HTML, parsed — what a crawler reads before any script runs. */
export function fetchHtml(url: string, headers: Record<string, string> = {}): Cypress.Chainable<{ status: number; doc: Document; headers: Record<string, string | string[]> }> {
  return cy.request({ url, headers, failOnStatusCode: false }).then((res) => ({
    status: res.status,
    headers: res.headers,
    doc: new DOMParser().parseFromString(String(res.body), 'text/html'),
  }));
}

export const metaContent = (doc: Document, selector: string): string | null =>
  doc.querySelector(selector)?.getAttribute('content') ?? null;

/**
 * The served page is duncit.com's branded 404 (website/main-website/src/pages/
 * 404.astro): its only heading reads 404 and it asks crawlers not to index it.
 */
export function expectMainSite404(doc: Document, what: string): void {
  expect(doc.querySelector('main h1')?.textContent?.replaceAll(/\s+/g, ''), `${what} serves the 404 page`).to.eq('404');
  expect(metaContent(doc, 'meta[name="robots"]'), `${what} is noindex`).to.eq('noindex');
}

/**
 * The line of a duncit.com call-out band (components/page/CtaBand.astro),
 * found by the band's heading: its prose, without the action pills beside it.
 */
export const ctaBandLine = (heading: string): Cypress.Chainable<JQuery<HTMLElement>> =>
  cy.contains('main section h2', heading).siblings('.cta-copy');

/**
 * The SiteMeta block every Astro page carries (@duncit/brand/site-meta.ts):
 * title (with " | <site>" unless it names itself), description, canonical, OG.
 */
export function expectSiteMeta(doc: Document, expected: { title: string; siteName: string; canonical: string; description?: string }): void {
  const namesItself = expected.title.toLowerCase().includes(expected.siteName.toLowerCase());
  const fullTitle = namesItself ? expected.title : `${expected.title} | ${expected.siteName}`;
  expect(doc.title, 'document title').to.eq(fullTitle);
  expect(doc.querySelector('link[rel="canonical"]')?.getAttribute('href'), 'canonical').to.eq(expected.canonical);
  expect(metaContent(doc, 'meta[property="og:url"]'), 'og:url').to.eq(expected.canonical);
  expect(metaContent(doc, 'meta[property="og:site_name"]'), 'og:site_name').to.eq(expected.siteName);
  expect(metaContent(doc, 'meta[property="og:title"]'), 'og:title').to.eq(expected.title);
  const description = metaContent(doc, 'meta[name="description"]');
  if (expected.description === undefined) expect(description, 'meta description').to.be.a('string').and.not.be.empty;
  else expect(description, 'meta description').to.eq(expected.description);
  expect(metaContent(doc, 'meta[property="og:description"]'), 'og:description').to.eq(description);
}

/** The element's box sits inside the viewport — what "the page scrolls to #x" means on screen. */
export function expectInViewport($el: JQuery<HTMLElement>): void {
  const rect = $el[0].getBoundingClientRect();
  const height = $el[0].ownerDocument.defaultView?.innerHeight ?? 0;
  expect(rect.top, 'top edge on screen').to.be.lessThan(height);
  expect(rect.bottom, 'bottom edge on screen').to.be.greaterThan(0);
}

/**
 * Count — and refuse at the network — every request carrying `fragment`, for a
 * form whose client validation must stop the submit. Should validation ever let
 * one through, nothing reaches staging and the zero-count assertion fails.
 */
export function guardMutation(fragment: string, alias: string): void {
  claimed.set(alias, 0);
  cy.intercept({ method: 'POST', url: String(Cypress.env('GRAPHQL_URL')) }, (req) => {
    const body = req.body as { query?: string } | undefined;
    if (typeof body?.query === 'string' && body.query.includes(fragment)) {
      req.alias = alias;
      claim(alias);
      req.reply({ forceNetworkError: true });
    }
  });
}

/** No request has been sent under `alias` (set by guardMutation or interceptQuery in this test). */
export const expectNeverSent = (alias: string): void => {
  cy.wrap(alias, { log: false }).should((name) => {
    expect(claimed.has(name), `@${name} is watched in this test`).to.eq(true);
    expect(claimed.get(name), `requests sent as @${name}`).to.eq(0);
  });
};

/** Ask Chrome to report `prefers-reduced-motion: reduce` (or clear it). Chrome only — CI runs --browser chrome. */
export function emulateReducedMotion(on: boolean): Cypress.Chainable<unknown> {
  return cy.wrap(
    Cypress.automation('remote:debugger:protocol', {
      command: 'Emulation.setEmulatedMedia',
      params: { features: on ? [{ name: 'prefers-reduced-motion', value: 'reduce' }] : [] },
    }),
    { log: false },
  );
}

/** Wait until a captcha widget under `scope` holds a fresh challenge, and yield its token. */
export function captchaToken(scope: string): Cypress.Chainable<string> {
  return cy
    .get(`${scope} [data-captcha-token]`)
    .should(($input) => expect(String($input.val())).not.to.eq(''))
    .then(($input) => String($input.val()));
}

/** A captcha answer that cannot match: the code is 5 of 31 symbols, and the digit 1 is not one of them. */
export const WRONG_CAPTCHA = '11111';

/** Collapse whitespace the way a reader sees the text. */
export const squish = (text: string): string => text.replaceAll(/\s+/g, ' ').trim();

/**
 * `.should('readText', expected)`: the element's text as a reader sees it.
 * Astro keeps the source's line breaks and indentation around an expression, so
 * an exact `have.text` would fail on whitespace no visitor ever sees.
 */
chai.Assertion.addMethod('readText', function readText(this: Chai.AssertionStatic, expected: string) {
  const subject = chai.util.flag(this, 'object') as JQuery<HTMLElement>;
  const actual = squish(Cypress.$(subject).text());
  this.assert(
    actual === expected,
    'expected #{this} to read #{exp} but it read #{act}',
    'expected #{this} not to read #{exp}',
    expected,
    actual,
  );
});
