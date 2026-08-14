import { renderMjml, applyVars } from '@modules/content/emailTemplate/emailTemplate.service';
import { FRAGMENT_DEFAULTS } from '@modules/content/emailFragment/emailFragment.defaults';
import { composeFragment } from '@modules/content/emailFragment/emailFragment.service';
import { EMAIL_FALLBACK } from '@services/email/email-i18n';

const base: Record<string, string> = { brand_logo_url: 'x', support_email: 's@d.com', website_url: 'w', app_name: 'Duncit', year: '2026', unsubscribe_url: 'u' };
for (const [k, v] of Object.entries(EMAIL_FALLBACK)) base[`t:${k}`] = v;

const NOTE = '{{t:email.venueSlotRequest.footer}}';
const frag = FRAGMENT_DEFAULTS.find((f) => f.category === 'notification')!;
const body = '<mjml><mj-body><mj-section><mj-column><mj-text>hi</mj-text></mj-column></mj-section></mj-body></mjml>';
const source = composeFragment(body, frag.header_mjml, frag.footer_mjml).mjml;

// Before the fix: the note went in raw, after every t: key had been replaced.
const before = renderMjml(source, { ...base, footer_note: NOTE }).html;
// After the fix: the note is resolved against the same map first.
const after = renderMjml(source, { ...base, footer_note: applyVars(NOTE, base) }).html;

const SENTENCE = EMAIL_FALLBACK['email.venueSlotRequest.footer'].slice(0, 40);
console.log('BEFORE — literal placeholder shipped:', before.includes(NOTE), '| sentence present:', before.includes(SENTENCE));
console.log('AFTER  — literal placeholder shipped:', after.includes(NOTE), '| sentence present:', after.includes(SENTENCE));
