/**
 * The tracking-consent banner every Duncit website shows (GDPR / ePrivacy).
 *
 * Framework-free DOM, so the four Astro sites (ConsentBanner.astro) and the two
 * React ones (status, the pet store) mount the same banner. The choice goes in
 * the shared `.duncit.com` cookie from @duncit/utils, so answering it on one
 * site answers it on mWeb and every other subdomain too.
 *
 * What makes the consent valid, and must not be "designed away":
 *   - nothing optional is on before an answer — the checkboxes start unticked;
 *   - "Reject all" is a first-level button exactly as prominent as "Accept all";
 *   - the banner can be reopened from any `[data-consent-open]` element (the
 *     footer's "Privacy choices" link), so withdrawing is as easy as agreeing.
 */
import {
  clearWithdrawnStorage,
  makeConsent,
  readWebConsent,
  writeWebConsent,
  type ConsentChoice,
} from '@duncit/utils';

export interface ConsentBannerCopy {
  label: string;
  title: string;
  body: string;
  acceptAll: string;
  rejectAll: string;
  customise: string;
  save: string;
  policyLink: string;
  essentialTitle: string;
  essentialBody: string;
  alwaysOn: string;
  analyticsTitle: string;
  analyticsBody: string;
  marketingTitle: string;
  marketingBody: string;
}

/** The `privacy.*` key behind every line of the banner (PRIVACY_BUNDLE). */
export const CONSENT_BANNER_KEYS: Readonly<Record<keyof ConsentBannerCopy, string>> = {
  label: 'privacy.banner.label',
  title: 'privacy.banner.title',
  body: 'privacy.banner.body',
  acceptAll: 'privacy.banner.acceptAll',
  rejectAll: 'privacy.banner.rejectAll',
  customise: 'privacy.banner.customise',
  save: 'privacy.banner.save',
  policyLink: 'privacy.banner.policyLink',
  essentialTitle: 'privacy.categories.essential.title',
  essentialBody: 'privacy.categories.essential.body',
  alwaysOn: 'privacy.categories.essential.alwaysOn',
  analyticsTitle: 'privacy.categories.analytics.title',
  analyticsBody: 'privacy.categories.analytics.body',
  marketingTitle: 'privacy.categories.marketing.title',
  marketingBody: 'privacy.categories.marketing.body',
};

/** Resolve the banner's copy through a site's translator. */
export function consentBannerCopy(t: (key: string) => string): ConsentBannerCopy {
  const entries = Object.entries(CONSENT_BANNER_KEYS).map(([field, key]) => [field, t(key)]);
  return Object.fromEntries(entries);
}

const STYLE_ID = 'duncit-consent-style';
const STYLE = `
.duncit-consent{position:fixed;left:16px;right:16px;bottom:16px;z-index:2147483000;max-width:640px;margin:0 auto;
  padding:20px;border-radius:12px;background:var(--color-surface,#fff);color:var(--color-ink,#16131a);
  box-shadow:0 8px 32px rgba(0,0,0,.24);font:400 15px/1.5 var(--font-body,system-ui,sans-serif)}
.duncit-consent[hidden]{display:none}
.duncit-consent h2{margin:0 0 8px;font:800 18px/1.3 var(--font-head,system-ui,sans-serif)}
.duncit-consent p{margin:0 0 12px}
.duncit-consent a{color:inherit;text-decoration:underline}
.duncit-consent fieldset{border:0;margin:0 0 12px;padding:0}
.duncit-consent label{display:flex;gap:10px;align-items:flex-start;padding:8px 0;cursor:pointer}
.duncit-consent input{width:20px;height:20px;margin-top:2px;flex:none;accent-color:#D92D2D}
.duncit-consent .dc-actions{display:flex;flex-wrap:wrap;gap:8px}
.duncit-consent button{min-height:44px;padding:0 18px;border-radius:8px;font-family:inherit;font-size:15px;font-weight:700;line-height:1;cursor:pointer}
.duncit-consent .dc-primary{flex:1 1 140px;border:2px solid #D92D2D;background:#D92D2D;color:#fff}
.duncit-consent .dc-secondary{border:2px solid currentColor;background:transparent;color:inherit}
.duncit-consent button:focus-visible,.duncit-consent input:focus-visible,.duncit-consent a:focus-visible{
  outline:3px solid #1a73e8;outline-offset:2px}
`;

function el<K extends keyof HTMLElementTagNameMap>(
  doc: Document,
  tag: K,
  props: Partial<HTMLElementTagNameMap[K]> = {}
): HTMLElementTagNameMap[K] {
  return Object.assign(doc.createElement(tag), props);
}

function categoryRow(doc: Document, title: string, body: string, input: HTMLInputElement) {
  const label = el(doc, 'label');
  const text = el(doc, 'span');
  text.append(el(doc, 'strong', { textContent: title }), el(doc, 'br'), body);
  label.append(input, text);
  return label;
}

/** GA's own cookies (`_ga`, `_ga_<id>`), deleted when analytics is withdrawn. */
function clearAnalyticsCookies(doc: Document): void {
  const names = doc.cookie
    .split(';')
    .map((part) => part.trim().split('=')[0])
    .filter((name) => name.startsWith('_ga'));
  const host = doc.location.hostname;
  for (const name of names) {
    for (const domain of ['', `; domain=${host}`, '; domain=.duncit.com']) {
      doc.cookie = `${name}=; path=/; max-age=0${domain}`;
    }
  }
}

function save(choice: ConsentChoice, doc: Document): void {
  writeWebConsent(choice, doc);
  clearWithdrawnStorage(choice);
  if (!choice.analytics) clearAnalyticsCookies(doc);
}

/**
 * Mount the banner. It shows itself when this browser has no current answer,
 * and again whenever a `[data-consent-open]` element is clicked.
 */
export function mountConsentBanner(
  copy: ConsentBannerCopy,
  options: { policyUrl: string },
  doc: Document = globalThis.document
): void {
  if (!doc.getElementById(STYLE_ID)) {
    doc.head.append(el(doc, 'style', { id: STYLE_ID, textContent: STYLE }));
  }
  const root = el(doc, 'section', { className: 'duncit-consent', hidden: true });
  const titleId = 'duncit-consent-title';
  root.setAttribute('aria-labelledby', titleId);

  const body = el(doc, 'p', { textContent: `${copy.body} ` });
  body.append(el(doc, 'a', { href: options.policyUrl, textContent: copy.policyLink }));

  const essential = el(doc, 'input', { type: 'checkbox', checked: true, disabled: true });
  const analytics = el(doc, 'input', { type: 'checkbox', name: 'analytics' });
  const marketing = el(doc, 'input', { type: 'checkbox', name: 'marketing' });
  const choices = el(doc, 'fieldset', { hidden: true });
  choices.setAttribute('aria-label', copy.label);
  choices.append(
    categoryRow(doc, `${copy.essentialTitle} · ${copy.alwaysOn}`, copy.essentialBody, essential),
    categoryRow(doc, copy.analyticsTitle, copy.analyticsBody, analytics),
    categoryRow(doc, copy.marketingTitle, copy.marketingBody, marketing)
  );

  const accept = el(doc, 'button', { type: 'button', className: 'dc-primary', textContent: copy.acceptAll });
  const reject = el(doc, 'button', { type: 'button', className: 'dc-primary', textContent: copy.rejectAll });
  const customise = el(doc, 'button', {
    type: 'button',
    className: 'dc-secondary',
    textContent: copy.customise,
  });
  customise.setAttribute('aria-expanded', 'false');
  const actions = el(doc, 'div', { className: 'dc-actions' });
  actions.append(accept, reject, customise);

  root.append(el(doc, 'h2', { id: titleId, textContent: copy.title }), body, choices, actions);
  doc.body.append(root);

  const close = (choice: ConsentChoice) => {
    save(choice, doc);
    root.hidden = true;
  };
  const open = () => {
    const current = readWebConsent(doc);
    analytics.checked = current?.analytics === true;
    marketing.checked = current?.marketing === true;
    root.hidden = false;
    accept.focus();
  };

  accept.addEventListener('click', () => close(makeConsent({ analytics: true, marketing: true })));
  reject.addEventListener('click', () => close(makeConsent({ analytics: false, marketing: false })));
  customise.addEventListener('click', () => {
    if (choices.hidden) {
      choices.hidden = false;
      customise.textContent = copy.save;
      customise.setAttribute('aria-expanded', 'true');
      analytics.focus();
      return;
    }
    close(makeConsent({ analytics: analytics.checked, marketing: marketing.checked }));
  });
  doc.addEventListener('click', (event) => {
    const opener = (event.target as Element | null)?.closest?.('[data-consent-open]');
    if (!opener) return;
    event.preventDefault();
    open();
  });

  if (!readWebConsent(doc)) root.hidden = false;
}
