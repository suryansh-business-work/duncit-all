/* Render every seeded default the way a real send does, and fail loudly on an
 * MJML error or a placeholder nothing filled. */
import { TEMPLATE_DEFAULTS } from '@modules/content/emailTemplate/emailTemplate.defaults';
import {
  renderMjml,
  applyVars,
  detectVariables,
} from '@modules/content/emailTemplate/emailTemplate.service';
import { FRAGMENT_DEFAULTS, CATEGORY_NOTE_KEY } from '@modules/content/emailFragment/emailFragment.defaults';
import { composeFragment } from '@modules/content/emailFragment/emailFragment.service';
import { EMAIL_FALLBACK } from '@services/email/email-i18n';
import { TEMPLATE_CATEGORIES, TEMPLATE_FOOTER_NOTES } from '@services/email/template-categories';

const SAMPLE: Record<string, string> = {
  name: 'Riya',
  portal_name: 'Onboarding',
  portal_url: 'https://onboarding.duncit.com',
  contact_person: 'Riya',
  brand_name: 'Kettle & Co',
  owner_name: 'Riya',
  venue_name: 'The Loft',
  host_name: 'Riya',
  host_email: 'riya@example.com',
  status: 'deactivated',
  policies: 'Terms of Use · Privacy Policy',
  policies_url: 'https://duncit.com/policies',
};

const CHROME: Record<string, string> = {
  brand_logo_url: 'https://cdn.example.com/logo.png',
  support_email: 'support@duncit.com',
  website_url: 'https://duncit.com',
  app_name: 'Duncit',
  year: '2026',
  unsubscribe_url: 'https://duncit.com/email-preferences',
};

const translations: Record<string, string> = {};
for (const [key, value] of Object.entries(EMAIL_FALLBACK)) translations[`t:${key}`] = value;

let failed = 0;
for (const tpl of TEMPLATE_DEFAULTS) {
  const fragmentKey = TEMPLATE_CATEGORIES[tpl.slug] ?? null;
  const fragment = FRAGMENT_DEFAULTS.find((f) => f.category === fragmentKey);
  if (fragmentKey && !fragment) {
    console.error(`FAIL ${tpl.slug}: no fragment for category "${fragmentKey}"`);
    failed += 1;
    continue;
  }

  const vars: Record<string, string> = { ...CHROME, ...translations, ...SAMPLE };
  const own = (TEMPLATE_FOOTER_NOTES[tpl.slug] ?? '').trim();
  const categoryNote = fragmentKey
    ? vars[`t:${CATEGORY_NOTE_KEY[fragmentKey as keyof typeof CATEGORY_NOTE_KEY]}`]
    : '';
  vars.footer_note = own ? applyVars(own, vars) : (categoryNote ?? '');

  const source = fragment
    ? composeFragment(tpl.mjml, fragment.header_mjml, fragment.footer_mjml).mjml
    : tpl.mjml;
  const { html, errors } = renderMjml(source, vars);
  const subject = applyVars(tpl.subject, vars);

  const leftover = [...(html.match(/{{[^}]*}}/g) ?? []), ...(subject.match(/{{[^}]*}}/g) ?? [])];
  const missingKeys = detectVariables(tpl.mjml).filter((k) => !(k in SAMPLE));
  const unknownTranslations = [...tpl.mjml.matchAll(/{{t:([^}]+)}}/g)]
    .map((m) => m[1])
    .filter((k) => !(k in EMAIL_FALLBACK));

  const problems = [
    ...errors.map((e) => `mjml: ${e}`),
    ...leftover.map((l) => `unfilled placeholder: ${l}`),
    ...missingKeys.map((k) => `variable no send site passes: ${k}`),
    ...unknownTranslations.map((k) => `translation key not in EMAIL_FALLBACK: ${k}`),
  ];

  if (problems.length) {
    failed += 1;
    console.error(`FAIL ${tpl.slug}\n  ${problems.join('\n  ')}`);
  } else {
    console.log(
      `ok   ${tpl.slug.padEnd(24)} fragment=${String(fragmentKey).padEnd(13)} ${html.length} bytes | ${subject}`
    );
  }
}

console.log(failed ? `\n${failed} template(s) failed` : `\nall ${TEMPLATE_DEFAULTS.length} templates render`);
process.exit(failed ? 1 : 0);
