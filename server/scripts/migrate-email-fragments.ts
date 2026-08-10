/**
 * Move every email template's header and footer into its category fragment.
 *
 *   npm run migrate:email-fragments:dry     # report only, touches nothing
 *   npm run migrate:email-fragments         # write to the database
 *   npm run migrate:email-fragments -- --disk   # rewrite the on-disk .mjml too
 *   npm run migrate:email-fragments:dry -- --assign-unmapped=transactional
 *
 * Every template carried its own copy of the logo section and the copyright
 * section. That is one place to edit a support address multiplied by
 * thirty-five, and nobody was ever going to edit all thirty-five. The chrome
 * moves into the fragment; the body stays in the template.
 *
 * The one thing that must NOT be flattened is the footer's sentence — fifteen
 * distinct "you're receiving this because…" lines, one per situation. Those are
 * lifted into `footer_note` on the template, and the fragment's footer renders
 * them. A template with none falls back to its category's generic note.
 *
 * `--assign-unmapped=<fragment key>` covers the templates this repo does not
 * ship: anything an admin creates in Tech > Emails > Templates gets
 * `fragment_key: null` from the model default, so it sends with no logo, no
 * support line and no copyright — and because its slug is in no category map,
 * every run of this script used to report it and move on, forever. The flag is
 * the deliberate answer to "and what wraps THOSE?", and it stays a flag rather
 * than a default because picking a footer silently is how a campaign ends up
 * carrying the internal one.
 *
 * Idempotent: a template with no logo section and no copyright section, already
 * pointed at the fragment it should be, is reported as `already` and not
 * written. Safe to re-run against any environment.
 *
 * The action column, which is the whole point of running the dry form first:
 *   already      nothing to do
 *   linked       gains a fragment; its body is untouched
 *   stripped     gains a fragment AND loses the header/footer it drew itself
 *   skipped      uncategorised, no fallback given — left exactly as it is
 *   no-fragment  names a fragment this database does not have; NOT written,
 *                because the key alone would send the email bare
 */
import fs from 'node:fs';
import path from 'node:path';
import mongoose from 'mongoose';
import { EmailTemplateModel } from '@modules/content/emailTemplate/emailTemplate.model';
import { EmailFragmentModel } from '@modules/content/emailFragment/emailFragment.model';
import { EMAIL_CATEGORIES } from '@services/email/email.provider';
import { TEMPLATE_CATEGORIES } from '@services/email/template-categories';

/** `--flag=value` or `--flag value`, whichever the operator typed. */
function argValue(flag: string): string | null {
  const inline = process.argv.find((arg) => arg.startsWith(`${flag}=`));
  if (inline) return inline.slice(flag.length + 1).trim() || null;
  const index = process.argv.indexOf(flag);
  const next = index === -1 ? '' : (process.argv[index + 1] ?? '');
  return next && !next.startsWith('-') ? next.trim() : null;
}

const DRY = process.argv.includes('--dry-run');
const DISK = process.argv.includes('--disk');
/** The fragment an admin's own template gets when it names none. */
const ASSIGN_UNMAPPED = argValue('--assign-unmapped');
const TEMPLATES_DIR = path.join(__dirname, '..', 'src', 'services', 'email', 'templates');

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
  const cuts = [header, footer].filter(Boolean).sort((a, b) => b!.start - a!.start);
  let out = mjml;
  for (const cut of cuts) {
    // Take the whole line the section sits on, so no blank indent is left behind.
    let from = cut!.start;
    while (from > 0 && (out[from - 1] === ' ' || out[from - 1] === '\t')) from -= 1;
    let to = cut!.end;
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

interface Row {
  slug: string;
  category: string;
  note: string;
  action: string;
}

function report(rows: Row[]): void {
  const width = Math.max(...rows.map((r) => r.slug.length), 4);
  for (const row of rows) {
    const note = row.note.length > 58 ? `${row.note.slice(0, 55)}…` : row.note;
    console.log(
      `  ${row.slug.padEnd(width)}  ${row.category.padEnd(14)}  ${row.action.padEnd(10)}  ${note}`
    );
  }
}

/** Rewrite the .mjml files so a fresh install seeds bodies, not chrome. */
function migrateDisk(): Row[] {
  const rows: Row[] = [];
  for (const file of fs.readdirSync(TEMPLATES_DIR).filter((f) => f.endsWith('.mjml'))) {
    const slug = file.replace(/\.mjml$/, '');
    const full = path.join(TEMPLATES_DIR, file);
    const source = fs.readFileSync(full, 'utf8');
    const result = stripChrome(source);
    const action = result.removedHeader || result.removedFooter ? 'stripped' : 'already';
    rows.push({ slug, category: TEMPLATE_CATEGORIES[slug] ?? '(unmapped)', note: result.footerNote, action });
    if (action === 'stripped' && !DRY) fs.writeFileSync(full, result.mjml);
  }
  return rows;
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
function planDocument(
  doc: { slug: string; mjml: string; fragment_key?: string | null; footer_note?: string },
  known: ReadonlySet<string>,
  fallback: string | null
): { row: Row; changes?: { mjml: string; key: string; note?: string } } {
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
async function fragmentKeys(): Promise<Set<string>> {
  const docs = await EmailFragmentModel.find().select('key').lean();
  return new Set(docs.map((doc) => String(doc.key)));
}

/**
 * The nine that ship are seeded by the server on boot. Run this against a
 * database no new server has started against and they are simply not there —
 * every template would be linked to a key with nothing behind it, every email
 * would send bare, and this script would report a clean migration.
 */
function reportFragments(known: ReadonlySet<string>): void {
  console.log(`Fragments in this database: ${known.size}`);
  const missing = EMAIL_CATEGORIES.filter((category) => !known.has(category));
  if (missing.length === 0) return;
  console.log(`  MISSING: ${missing.join(', ')}`);
  console.log('  Start the server once against this database — it seeds them on boot.');
}

async function migrateDatabase(known: ReadonlySet<string>, fallback: string | null): Promise<Row[]> {
  const rows: Row[] = [];
  const docs = await EmailTemplateModel.find().sort({ slug: 1 }).exec();
  for (const doc of docs) {
    const { row, changes } = planDocument(doc, known, fallback);
    rows.push(row);
    if (!changes || DRY) continue;
    doc.mjml = changes.mjml;
    doc.fragment_key = changes.key;
    if (changes.note !== undefined) doc.footer_note = changes.note;
    await doc.save();
  }
  return rows;
}

async function main(): Promise<void> {
  console.log(DRY ? 'DRY RUN — nothing is written\n' : 'Writing changes\n');

  if (DISK) {
    console.log('On-disk templates:');
    report(migrateDisk());
    console.log('');
  }

  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.log('MONGO_URI is not set — skipping the database half.');
    console.log('Set it to migrate stored templates:  MONGO_URI=... npm run migrate:email-fragments');
    return;
  }

  await mongoose.connect(uri, { dbName: process.env.MONGO_DB_NAME });
  try {
    const known = await fragmentKeys();
    reportFragments(known);

    // Refused before a single template is read: a fallback nobody can render is
    // worse than no fallback, and the operator has almost certainly typed a
    // category name that this database spells differently.
    if (ASSIGN_UNMAPPED && !known.has(ASSIGN_UNMAPPED)) {
      const available = [...known].sort((a, b) => a.localeCompare(b)).join(', ');
      console.log(`\nNo fragment "${ASSIGN_UNMAPPED}" here. Available: ${available || '(none)'}`);
      process.exitCode = 1;
      return;
    }

    console.log('\nStored templates:');
    const rows = await migrateDatabase(known, ASSIGN_UNMAPPED);
    report(rows);
    const counts = rows.reduce<Record<string, number>>((acc, r) => {
      acc[r.action] = (acc[r.action] ?? 0) + 1;
      return acc;
    }, {});
    console.log(
      `\n${rows.length} template(s): ` +
        Object.entries(counts)
          .map(([k, v]) => `${v} ${k}`)
          .join(', ')
    );
  } finally {
    await mongoose.disconnect();
  }
}

// Importable for verification without touching a database.
if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
