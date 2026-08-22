import { EMAIL_CATALOGUE, CATALOGUE_TEMPLATE_DEFAULTS } from '@services/email/catalogue';
import { EMAIL_FALLBACK } from '@services/email/email-i18n';
import { WA_EVENT_BY_KEY } from '@modules/platform/whatsapp/whatsapp.events';

const keys = new Set<string>();
for (const row of EMAIL_CATALOGUE) {
  for (const m of (row.mjml ?? '').matchAll(/\{\{t:([\w.]+)\}\}/g)) keys.add(m[1]);
  if (row.footerNote) for (const m of row.footerNote.matchAll(/\{\{t:([\w.]+)\}\}/g)) keys.add(m[1]);
}
const missing = [...keys].filter((k) => !(k in EMAIL_FALLBACK)).sort();
console.log('TOTAL ROWS', EMAIL_CATALOGUE.length, '| WITH BODY', CATALOGUE_TEMPLATE_DEFAULTS.length);
console.log('MISSING KEYS', missing.length);
console.log(missing.join('\n'));
console.log('--- WA LINK CHECK ---');
for (const row of EMAIL_CATALOGUE) {
  if (!row.waEvent) continue;
  const ev = WA_EVENT_BY_KEY.get(row.waEvent);
  if (!ev) { console.log('UNKNOWN WA EVENT', row.slug, row.waEvent); continue; }
  if (row.vars.length < ev.params.length) console.log('TOO FEW VARS', row.slug, row.vars.length, '<', ev.params.length);
}
