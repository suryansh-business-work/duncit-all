/**
 * The gate that keeps the email catalogue honest.
 *
 *   npm run check:emails
 *
 * `tsc` proves a catalogue row is well FORMED; none of what it says has to be
 * TRUE. These five checks are the ones whose failure is invisible until a
 * reader opens the email:
 *
 * 1. A `waEvent` that is not in `WA_EVENTS`. `notifyEvent` looks the email up by
 *    that key, so a typo means the WhatsApp message goes and the email silently
 *    never does — no error, no log row, nothing.
 *
 * 2. Fewer `vars` than the event has `params`. The positional fill runs off the
 *    end and the extra values are dropped, so the email quietly says less than
 *    the WhatsApp message it was written to match.
 *
 * 3. A `{{t:…}}` key that is not in `EMAIL_FALLBACK`. Rule 38: the bundle is
 *    what renders before the catalogue answers and when it cannot, so a key
 *    missing from it ships literal braces to a reader.
 *
 * 4. A `{{var}}` in a body that no `vars` entry and no chrome variable declares.
 *    `applyVars` replaces what it is given and leaves the rest — an undeclared
 *    name renders as `{{seats_count}}` in somebody's inbox.
 *
 * 5. A declared variable the body never uses. Harmless to send, but it is the
 *    Tech portal's Variables panel promising a value that does nothing, which
 *    is worse than not listing it. One exception, and it is the reason this
 *    check needs a paragraph: a var INSIDE the linked WhatsApp event's arity is
 *    holding a positional slot, not offering itself to the body. Several
 *    campaigns print the pod's title twice, so the email declares `pod` and
 *    `pod_repeat` to keep the ordering true and renders `pod_title` once —
 *    which is the correct email and would otherwise fail this check forever.
 *
 * Every one of these fails the run. All five are visible to a reader, and none
 * has a reason to be tolerated.
 */
import { EMAIL_CATALOGUE, CHROME_VARS } from '@services/email/catalogue';
import { EMAIL_FALLBACK } from '@services/email/email-i18n';
import { WA_EVENT_BY_KEY } from '@modules/platform/whatsapp/whatsapp.events';

const problems: string[] = [];
const note = (slug: string, message: string) => problems.push(`${slug}: ${message}`);

/** Names the chrome supplies to every send, whatever the template says. */
const CHROME = new Set(CHROME_VARS.map((variable) => variable.key));

/** Every `{{name}}` in a body, translation keys excluded. */
function bodyVars(mjml: string): Set<string> {
  const found = new Set<string>();
  for (const match of mjml.matchAll(/\{\{\s*([\w.:]+)\s*\}\}/g)) {
    const name = match[1];
    if (name && !name.startsWith('t:')) found.add(name);
  }
  return found;
}

/** Every `{{t:key}}` in a body or a footer sentence. */
function translationKeys(source: string): Set<string> {
  const found = new Set<string>();
  for (const match of source.matchAll(/\{\{t:([\w.]+)\}\}/g)) {
    if (match[1]) found.add(match[1]);
  }
  return found;
}

for (const row of EMAIL_CATALOGUE) {
  const event = row.waEvent ? WA_EVENT_BY_KEY.get(row.waEvent) : undefined;
  /** How many of this row's vars exist to hold a WhatsApp positional slot. */
  const positional = event?.params.length ?? 0;

  // 1 + 2 — the positional contract with the WhatsApp catalogue.
  if (row.waEvent) {
    if (!event) {
      note(row.slug, `waEvent "${row.waEvent}" is not in WA_EVENTS`);
    } else if (row.vars.length < event.params.length) {
      note(
        row.slug,
        `${row.vars.length} vars for an event with ${event.params.length} params — ` +
          `the first ${event.params.length} must line up with [${event.params.join(', ')}]`
      );
    }
  }

  // 3 — every localized string is in the shipped bundle.
  for (const key of translationKeys(`${row.mjml ?? ''}${row.footerNote}`)) {
    if (!(key in EMAIL_FALLBACK)) note(row.slug, `translation key "${key}" is not in EMAIL_FALLBACK`);
  }

  // 4 + 5 — the body and the declared variables agree.
  if (!row.mjml) continue;
  const declared = new Set(row.vars.map((variable) => variable.key));
  const used = bodyVars(row.mjml);
  for (const name of used) {
    if (!declared.has(name) && !CHROME.has(name)) {
      note(row.slug, `body renders {{${name}}} but nothing declares it`);
    }
  }
  row.vars.forEach((variable, index) => {
    // Inside the WhatsApp arity is a positional slot, not an offer to the body.
    if (index < positional || used.has(variable.key)) return;
    note(row.slug, `declares "${variable.key}" but the body never renders it`);
  });
}

const withBody = EMAIL_CATALOGUE.filter((row) => row.mjml).length;
console.log(
  `check:emails — ${EMAIL_CATALOGUE.length} catalogue row(s), ${withBody} with a body of their own`
);

if (problems.length === 0) {
  console.log('check:emails: the catalogue, the bundle and the WhatsApp events all agree');
} else {
  console.error(`\ncheck:emails: ${problems.length} problem(s)\n`);
  for (const problem of problems) console.error(`  ${problem}`);
  process.exit(1);
}
