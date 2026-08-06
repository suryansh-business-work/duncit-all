/**
 * Move every email template's header and footer into its category fragment.
 *
 *   npm run migrate:email-fragments:dry     # report only, touches nothing
 *   npm run migrate:email-fragments         # write to the database
 *   npm run migrate:email-fragments -- --disk   # rewrite the on-disk .mjml too
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
 * Idempotent: a template with no logo section and no copyright section is
 * already migrated and is skipped. Safe to re-run against any environment.
 */
import fs from 'node:fs';
import path from 'node:path';
import mongoose from 'mongoose';
import { EmailTemplateModel } from '@modules/content/emailTemplate/emailTemplate.model';
import { TEMPLATE_CATEGORIES } from '@services/email/template-categories';

const DRY = process.argv.includes('--dry-run');
const DISK = process.argv.includes('--disk');
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

/** What one stored template needs, decided before anything is written. */
function planDocument(doc: {
  slug: string;
  mjml: string;
  fragment_category?: string | null;
  footer_note?: string;
}): { row: Row; changes?: { mjml: string; category: string; note?: string } } {
  const category = TEMPLATE_CATEGORIES[doc.slug];
  const result = stripChrome(doc.mjml);
  const touched = result.removedHeader || result.removedFooter;

  // An unmapped slug is a template nobody has categorised. Report it and leave
  // it exactly as it is rather than guessing where it belongs.
  if (!category) {
    return {
      row: { slug: doc.slug, category: '(unmapped)', note: result.footerNote, action: 'skipped' },
    };
  }

  const needsCategory = doc.fragment_category !== category;
  const needsNote = !doc.footer_note && !!result.footerNote;
  if (!touched && !needsCategory && !needsNote) {
    return { row: { slug: doc.slug, category, note: doc.footer_note ?? '', action: 'already' } };
  }

  return {
    row: {
      slug: doc.slug,
      category,
      note: needsNote ? result.footerNote : (doc.footer_note ?? ''),
      action: touched ? 'stripped' : 'linked',
    },
    changes: {
      mjml: result.mjml,
      category,
      ...(needsNote ? { note: result.footerNote } : {}),
    },
  };
}

async function migrateDatabase(): Promise<Row[]> {
  const rows: Row[] = [];
  const docs = await EmailTemplateModel.find().sort({ slug: 1 }).exec();
  for (const doc of docs) {
    const { row, changes } = planDocument(doc);
    rows.push(row);
    if (!changes || DRY) continue;
    doc.mjml = changes.mjml;
    doc.fragment_category = changes.category;
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
    console.log('Stored templates:');
    const rows = await migrateDatabase();
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
