/**
 * Connecting stored email templates to their header/footer fragment.
 *
 * A shipped body is drawn with `shell()` and carries NO logo and NO footer of
 * its own — those come only from the fragment its row names in `fragment_key`.
 * A row created before fragments existed has `fragment_key: null`, and once
 * `upgradeShippedDefaults` swaps its old full-chrome body for the bare one it
 * sends with no header and no footer at all. This is the one place that plans
 * and applies the link; boot (`seedDefaults`), the Communications portal's
 * "Connect header & footer" action and `npm run migrate:email-fragments` all
 * call it, so they cannot disagree.
 */
import { EmailTemplateModel } from './emailTemplate.model';
import { EmailFragmentModel } from '@modules/content/emailFragment/emailFragment.model';
import { TEMPLATE_CATEGORIES } from '@services/email/template-categories';
import { logs } from '@observability/log';

export interface StripResult {
  mjml: string;
  /** The sentence the removed footer carried, without its "© Duncit." prefix. */
  footerNote: string;
  removedHeader: boolean;
  removedFooter: boolean;
}

/**
 * Every top-level `<mj-section>…</mj-section>` span in the source.
 *
 * A scan rather than a regex: `<mj-section[\s\S]*?</mj-section>` is the pattern
 * that backtracks on a long unclosed tag, and an email body is exactly the
 * place not to hand a regex that shape. MJML sections do not nest, so a
 * left-to-right walk is both correct and linear.
 */
function sectionSpans(mjml: string): { start: number; end: number }[] {
  const spans: { start: number; end: number }[] = [];
  const lower = mjml.toLowerCase();
  let cursor = 0;
  for (;;) {
    const open = lower.indexOf('<mj-section', cursor);
    if (open === -1) break;
    const close = lower.indexOf('</mj-section>', open);
    if (close === -1) break;
    spans.push({ start: open, end: close + '</mj-section>'.length });
    cursor = close + 1;
  }
  return spans;
}

/** Tags out, in one left-to-right pass — a regex here backtracks (S8786). */
function withoutTags(block: string): string {
  let out = '';
  let cursor = 0;
  while (cursor < block.length) {
    const open = block.indexOf('<', cursor);
    if (open === -1) return out + block.slice(cursor);
    out += `${block.slice(cursor, open)} `;
    const close = block.indexOf('>', open);
    if (close === -1) return out;
    cursor = close + 1;
  }
  return out;
}

/** The readable text of a section, with entities resolved enough to store. */
function sectionText(block: string): string {
  return withoutTags(block)
    .replace(/&copy;/gi, '©')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Drop the leading copyright so only the reason survives. The copyright is
 * whatever sits before the first full stop, because the brand in it is written
 * three different ways across the templates — "Duncit", "{{app_name}}", and in
 * one case "Duncit onboarding" with no reason after it at all.
 *
 *   "© Duncit. You're receiving this because…"  → "You're receiving this because…"
 *   "© {{app_name}}. You're receiving this…"    → "You're receiving this…"
 *   "© Duncit onboarding."                      → ""   (there is no reason to keep)
 */
function reasonOnly(text: string): string {
  if (!text.startsWith('©')) return text;
  const stop = text.indexOf('.');
  return stop === -1 ? '' : text.slice(stop + 1).trim();
}

/**
 * Remove the brand-logo section and the copyright section from a template.
 *
 * Anchored on CONTENT, not position: the header is whichever section renders
 * `brand_logo_url`, the footer is whichever renders a copyright. A template
 * that has neither comes back unchanged, which is what makes this re-runnable.
 */
export function stripChrome(mjml: string): StripResult {
  const spans = sectionSpans(mjml);
  const header = spans.find((s) => mjml.slice(s.start, s.end).includes('brand_logo_url'));
  const footer = [...spans]
    .reverse()
    .find((s) => /&copy;|©/i.test(mjml.slice(s.start, s.end)));

  if (!header && !footer) {
    return { mjml, footerNote: '', removedHeader: false, removedFooter: false };
  }

  const footerNote = footer ? reasonOnly(sectionText(mjml.slice(footer.start, footer.end))) : '';

  // Cut from the back so the earlier span's offsets stay valid.
  // A type-guard predicate rather than `filter(Boolean)`: the latter does not
  // narrow away `undefined`, which is why each use below needed a `!`.
  const cuts = [header, footer]
    .filter((s): s is NonNullable<typeof s> => Boolean(s))
    .sort((a, b) => b.start - a.start);
  let out = mjml;
  for (const cut of cuts) {
    // Take the whole line the section sits on, so no blank indent is left behind.
    let from = cut.start;
    while (from > 0 && (out[from - 1] === ' ' || out[from - 1] === '\t')) from -= 1;
    let to = cut.end;
    if (out.startsWith('\r\n', to)) to += 2;
    else if (out[to] === '\n') to += 1;
    out = out.slice(0, from) + out.slice(to);
  }

  return {
    mjml: out,
    footerNote,
    removedHeader: Boolean(header),
    removedFooter: Boolean(footer),
  };
}

/** One template's line in the plan — what was (or would be) done to it. */
export interface FragmentPlanRow {
  slug: string;
  category: string;
  note: string;
  action: 'already' | 'linked' | 'stripped' | 'skipped' | 'no-fragment';
}


/**
 * The fragment this template should end up naming, or null when there is
 * nothing to point it at.
 *
 * A slug this repo ships always follows the category map, so a wrong pick is
 * corrected on the next run. Anything else is somebody's own template: it keeps
 * a fragment that still exists, and takes the fallback only when it has none —
 * which is what stops a re-run from overwriting a choice an admin made in the
 * editor's fragment picker.
 *
 * A key naming a fragment that is gone survives the last line so the caller can
 * say so. Reporting it as uncategorised would be the one wrong answer: it IS
 * categorised, at something that no longer renders.
 */
function targetKey(
  slug: string,
  current: string | null | undefined,
  known: ReadonlySet<string>,
  fallback: string | null
): string | null {
  const mapped = TEMPLATE_CATEGORIES[slug];
  if (mapped) return mapped;
  if (current && known.has(current)) return current;
  if (fallback) return fallback;
  return current ?? null;
}

/** What one stored template needs, decided before anything is written. */
export function planDocument(
  doc: { slug: string; mjml: string; fragment_key?: string | null; footer_note?: string },
  known: ReadonlySet<string>,
  fallback: string | null
): { row: FragmentPlanRow; changes?: { mjml: string; key: string; note?: string } } {
  const result = stripChrome(doc.mjml);
  const note = doc.footer_note ?? '';
  const key = targetKey(doc.slug, doc.fragment_key, known, fallback);

  // Nobody has categorised this template and no fallback was given. Report it
  // and leave it exactly as it is rather than guessing where it belongs.
  if (!key) {
    return {
      row: { slug: doc.slug, category: '(unmapped)', note: result.footerNote, action: 'skipped' },
    };
  }

  // The fragment is not in this database. Writing the key regardless is what
  // makes an email send bare with nothing to show why: `emailFragmentService.
  // wrap` returns the body untouched for a key it cannot find, and says nothing.
  if (!known.has(key)) {
    return { row: { slug: doc.slug, category: key, note, action: 'no-fragment' } };
  }

  const touched = result.removedHeader || result.removedFooter;
  const needsKey = doc.fragment_key !== key;
  const needsNote = !note && !!result.footerNote;
  if (!touched && !needsKey && !needsNote) {
    return { row: { slug: doc.slug, category: key, note, action: 'already' } };
  }

  return {
    row: {
      slug: doc.slug,
      category: key,
      note: needsNote ? result.footerNote : note,
      action: touched ? 'stripped' : 'linked',
    },
    changes: {
      mjml: result.mjml,
      key,
      ...(needsNote ? { note: result.footerNote } : {}),
    },
  };
}

/**
 * Every fragment key the database holds, active or not.
 *
 * Not filtered by `is_active`: switching a fragment off is a deliberate choice
 * an admin makes instead of deleting it, and a template pointed at it is one
 * toggle away from being right again. A key with no row behind it is the only
 * broken case, and it is the one this set exists to catch.
 */
export async function fragmentKeys(): Promise<Set<string>> {
  const docs = await EmailFragmentModel.find().select('key').lean();
  return new Set(docs.map((doc) => String(doc.key)));
}

export interface ConnectFragmentsResult {
  rows: FragmentPlanRow[];
  /** How many templates gained a fragment (linked + stripped) — 0 on a dry run. */
  connected: number;
}

/**
 * Plan every stored template and, unless `dryRun`, write the ones that need a
 * fragment. `fallback` is the fragment an admin's own (unshipped) template gets
 * when it names none — without one those are reported `skipped`, never guessed.
 *
 * Each write is conditional on the body and key still being the ones read, so
 * an admin saving in the editor at the same moment wins, and two instances
 * booting together cannot double-strip. Idempotent: a second run reports
 * `already` for everything the first one linked.
 */
export async function connectTemplateFragments(
  options: { fallback?: string | null; dryRun?: boolean } = {}
): Promise<ConnectFragmentsResult> {
  const fallback = options.fallback ?? null;
  const known = await fragmentKeys();
  const docs = await EmailTemplateModel.find({}, { slug: 1, mjml: 1, fragment_key: 1, footer_note: 1 })
    .sort({ slug: 1 })
    .lean();
  const plans = docs.map((doc) => ({ doc, ...planDocument(doc, known, fallback) }));
  const rows: FragmentPlanRow[] = plans.map((plan) => plan.row);
  // Every write is conditional on the body it was planned from, so they are
  // independent of one another and can go out together.
  const writes = options.dryRun
    ? []
    : plans.flatMap(({ doc, changes }) =>
        changes
          ? [
              EmailTemplateModel.updateOne(
                { slug: doc.slug, mjml: doc.mjml, fragment_key: doc.fragment_key ?? null },
                {
                  $set: {
                    mjml: changes.mjml,
                    fragment_key: changes.key,
                    ...(changes.note === undefined ? {} : { footer_note: changes.note }),
                  },
                }
              ),
            ]
          : []
      );
  const connected = (await Promise.all(writes)).filter((result) => result.modifiedCount).length;
  const bare = rows.filter((row) => row.action === 'skipped' || row.action === 'no-fragment');
  if (connected || bare.length) {
    logs.server.info('emailTemplate', 'connectTemplateFragments', {
      connected,
      dry_run: Boolean(options.dryRun),
      still_bare: bare.map((row) => `${row.slug}:${row.action}`),
      msg: `${connected} template(s) connected to their header/footer; ${bare.length} still send without one`,
    });
  }
  return { rows, connected };
}
