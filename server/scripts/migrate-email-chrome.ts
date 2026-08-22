/**
 * Give every stored email template its header/footer fragment, its own footer
 * sentence, and its documented variables.
 *
 *   npm run migrate:email-chrome:dry              # report only, writes nothing
 *   npm run migrate:email-chrome                  # write to the database
 *   npm run migrate:email-chrome -- --assign-unmapped=notification
 *   npm run migrate:email-chrome -- --only=welcome,pod-refund
 *   npm run migrate:email-chrome:local            # against duncit-local
 *
 * WHY THIS EXISTS, in three parts:
 *
 * 1. HEADER AND FOOTER. `EmailTemplate.fragment_key` decides which of the nine
 *    header/footer fragments wraps a body. It defaults to null, and null renders
 *    the email BARE — no logo, no support line, no copyright, no unsubscribe.
 *    Anything an admin created in Tech > Emails > Templates has been sending
 *    that way since the day fragments shipped, because nothing ever set it.
 *
 * 2. THE FOOTER SENTENCE. `footer_note` is the template's own "you're receiving
 *    this because…" line, which the fragment's footer renders. Blank falls back
 *    to the category's generic note — correct, but "there was activity on your
 *    account" where "you joined this pod" was available.
 *
 * 3. THE VARIABLES. `EmailTemplate.variables` has been an empty array on nearly
 *    every stored row since the collection existed. `loadTemplate` fills it by
 *    regex-scanning the MJML for `{{ }}`, which finds NAMES and nothing else —
 *    no description, no sample. So the Tech portal's Variables panel showed a
 *    bare list, and the editor's preview rendered every value as an empty
 *    string, which is why a preview of the payment receipt showed a blank
 *    amount. The catalogue documents all three fields for every template the
 *    product ships, and this writes them onto the rows.
 *
 * Idempotent, and safe to re-run against any environment. It NEVER touches
 *   - `mjml`, `subject`, `name` or `is_active` — those are the admin's
 *   - a `fragment_key` an admin chose for a template the catalogue does not know
 *   - a `variables` entry an admin edited, unless `--reset-variables` is passed
 *
 * The action column, which is the whole point of running the dry form first:
 *   already      nothing to do
 *   updated      one or more of the three fields is being written
 *   skipped      uncategorised, no fallback given — left exactly as it is
 *   no-fragment  names a fragment this database does not have; NOT written,
 *                because the key alone would send the email bare
 */
import mongoose from 'mongoose';
import { EmailTemplateModel } from '@modules/content/emailTemplate/emailTemplate.model';
import { EmailFragmentModel } from '@modules/content/emailFragment/emailFragment.model';
import { EMAIL_CATEGORIES } from '@services/email/email.provider';
import { TEMPLATE_CATEGORIES, TEMPLATE_FOOTER_NOTES } from '@services/email/template-categories';
import { CATALOGUE_VARIABLES } from '@services/email/catalogue';
import { detectVariables } from '@modules/content/emailTemplate/emailTemplate.service';

/** `--flag=value` or `--flag value`, whichever the operator typed. */
function argValue(flag: string): string | null {
  const inline = process.argv.find((arg) => arg.startsWith(`${flag}=`));
  if (inline) return inline.slice(flag.length + 1).trim() || null;
  const index = process.argv.indexOf(flag);
  const next = index === -1 ? '' : (process.argv[index + 1] ?? '');
  return next && !next.startsWith('-') ? next.trim() : null;
}

const DRY = process.argv.includes('--dry-run');
/** The fragment a template the catalogue does not know should fall back to. */
const ASSIGN_UNMAPPED = argValue('--assign-unmapped');
/** Overwrite documented variables even where an admin has edited them. */
const RESET_VARIABLES = process.argv.includes('--reset-variables');
/** Limit the run to these slugs, for a targeted fix. */
const ONLY = new Set(
  (argValue('--only') ?? '')
    .split(',')
    .map((slug) => slug.trim())
    .filter(Boolean)
);

interface StoredVariable {
  key: string;
  description?: string;
  sample?: string;
}

interface StoredTemplate {
  slug: string;
  mjml: string;
  fragment_key?: string | null;
  footer_note?: string;
  variables?: StoredVariable[];
}

interface Plan {
  slug: string;
  fragment: string;
  action: 'already' | 'updated' | 'skipped' | 'no-fragment';
  note: string;
  changes?: Partial<Pick<StoredTemplate, 'fragment_key' | 'footer_note'>> & {
    variables?: StoredVariable[];
  };
}

/**
 * The fragment this template should end up naming, or null when there is
 * nothing to point it at.
 *
 * A slug the catalogue knows always follows the catalogue, so a wrong pick is
 * corrected on the next run. Anything else is somebody's own template: it keeps
 * a fragment that still exists, and takes the fallback only when it has none —
 * which is what stops a re-run from overwriting a choice an admin made in the
 * editor's fragment picker.
 */
function targetFragment(
  slug: string,
  current: string | null | undefined,
  known: ReadonlySet<string>,
  fallback: string | null
): string | null {
  const mapped = TEMPLATE_CATEGORIES[slug];
  if (mapped) return mapped;
  if (current && known.has(current)) return current;
  return fallback ?? current ?? null;
}

/**
 * The variables to store, merging what is documented with what is there.
 *
 * Three sources, in order of authority:
 *   1. the catalogue — the only one that carries a description AND a sample
 *   2. what the row already holds — an admin may have written their own
 *   3. the MJML itself — a `{{ }}` the catalogue has not caught up with yet
 *
 * An existing entry with a description of its own is KEPT over the catalogue's,
 * because it was typed by somebody on purpose. `--reset-variables` is the
 * deliberate way to say "no, take the catalogue's" — it exists because the
 * regex-scanned entries the old code wrote also count as "existing", and they
 * are exactly the empty ones this is meant to replace.
 */
function mergeVariables(stored: StoredTemplate): StoredVariable[] {
  const documented = CATALOGUE_VARIABLES[stored.slug] ?? [];
  const existing = new Map((stored.variables ?? []).map((row) => [row.key, row]));
  const out: StoredVariable[] = [];
  const seen = new Set<string>();

  for (const variable of documented) {
    const own = existing.get(variable.key);
    const keepOwn = !RESET_VARIABLES && own && (own.description?.trim() || own.sample?.trim());
    out.push(keepOwn ? { key: variable.key, description: own.description, sample: own.sample } : variable);
    seen.add(variable.key);
  }
  // Anything the row already had that the catalogue does not document — an
  // admin's own template, or a variable added to the MJML since. Dropping it
  // would delete somebody's note.
  for (const [key, row] of existing) {
    if (!seen.has(key)) {
      out.push(row);
      seen.add(key);
    }
  }
  // And finally whatever the body actually references but nothing has named.
  for (const key of detectVariables(stored.mjml)) {
    if (!seen.has(key) && !key.startsWith('t:')) {
      out.push({ key });
      seen.add(key);
    }
  }
  return out;
}

/** Do two variable lists say the same thing? Order included — the portal
 * renders them in stored order, so a reshuffle IS a change worth writing. */
function sameVariables(a: StoredVariable[], b: StoredVariable[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((row, index) => {
    const other = b[index];
    return (
      other !== undefined &&
      row.key === other.key &&
      (row.description ?? '') === (other.description ?? '') &&
      (row.sample ?? '') === (other.sample ?? '')
    );
  });
}

/** What one stored template needs, decided before anything is written. */
function planTemplate(
  doc: StoredTemplate,
  known: ReadonlySet<string>,
  fallback: string | null
): Plan {
  const fragment = targetFragment(doc.slug, doc.fragment_key, known, fallback);

  // Nobody has categorised this template and no fallback was given. Report it
  // and leave it exactly as it is rather than guessing where it belongs.
  if (!fragment) {
    return { slug: doc.slug, fragment: '(unmapped)', action: 'skipped', note: 'no fragment to point at' };
  }
  // The fragment is not in this database. Writing the key regardless is what
  // makes an email send bare with nothing to show why: `emailFragmentService.
  // wrap` returns the body untouched for a key it cannot find, and says nothing.
  if (!known.has(fragment)) {
    return { slug: doc.slug, fragment, action: 'no-fragment', note: 'start the server once to seed it' };
  }

  const documentedNote = TEMPLATE_FOOTER_NOTES[doc.slug] ?? '';
  const storedNote = (doc.footer_note ?? '').trim();
  const variables = mergeVariables(doc);

  const changes: Plan['changes'] = {};
  const reasons: string[] = [];
  if (doc.fragment_key !== fragment) {
    changes.fragment_key = fragment;
    reasons.push('fragment');
  }
  // Only fills a BLANK note. A sentence an admin wrote is theirs.
  if (!storedNote && documentedNote) {
    changes.footer_note = documentedNote;
    reasons.push('footer');
  }
  if (!sameVariables(doc.variables ?? [], variables)) {
    changes.variables = variables;
    reasons.push(`${variables.length} variable(s)`);
  }

  if (reasons.length === 0) {
    return { slug: doc.slug, fragment, action: 'already', note: '' };
  }
  return { slug: doc.slug, fragment, action: 'updated', note: reasons.join(' · '), changes };
}

function report(plans: Plan[]): void {
  const width = Math.max(...plans.map((plan) => plan.slug.length), 4);
  for (const plan of plans) {
    const note = plan.note.length > 60 ? `${plan.note.slice(0, 57)}…` : plan.note;
    console.log(
      `  ${plan.slug.padEnd(width)}  ${plan.fragment.padEnd(14)}  ${plan.action.padEnd(12)}  ${note}`
    );
  }
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
function reportFragments(known: ReadonlySet<string>): boolean {
  console.log(`Fragments in this database: ${known.size}`);
  const missing = EMAIL_CATEGORIES.filter((category) => !known.has(category));
  if (missing.length === 0) return true;
  console.log(`  MISSING: ${missing.join(', ')}`);
  console.log('  Start the server once against this database — it seeds them on boot.');
  return false;
}

async function migrate(known: ReadonlySet<string>, fallback: string | null): Promise<Plan[]> {
  const filter = ONLY.size > 0 ? { slug: { $in: [...ONLY] } } : {};
  const docs = await EmailTemplateModel.find(filter).sort({ slug: 1 }).exec();
  const plans: Plan[] = [];
  for (const doc of docs) {
    const plan = planTemplate(doc as unknown as StoredTemplate, known, fallback);
    plans.push(plan);
    if (!plan.changes || DRY) continue;
    // `$set` of exactly what changed. A whole-document save would also write
    // back the mjml and subject this script deliberately never reads.
    await EmailTemplateModel.updateOne({ slug: plan.slug }, { $set: plan.changes });
  }
  return plans;
}

async function main(): Promise<void> {
  console.log(DRY ? 'DRY RUN — nothing is written\n' : 'Writing changes\n');
  if (ONLY.size > 0) console.log(`Limited to: ${[...ONLY].join(', ')}\n`);
  if (RESET_VARIABLES) console.log('Resetting variables to the catalogue, admin edits included\n');

  const uri = argValue('--uri') ?? process.env.MONGO_URI;
  if (!uri) {
    console.log('No database to connect to.');
    console.log('Set MONGO_URI, or pass --uri mongodb://127.0.0.1:27017/duncit-local');
    process.exitCode = 1;
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
    const plans = await migrate(known, ASSIGN_UNMAPPED);
    report(plans);

    const counts = plans.reduce<Record<string, number>>((acc, plan) => {
      acc[plan.action] = (acc[plan.action] ?? 0) + 1;
      return acc;
    }, {});
    console.log(
      `\n${plans.length} template(s): ` +
        Object.entries(counts)
          .map(([action, count]) => `${count} ${action}`)
          .join(', ')
    );

    // The templates the catalogue documents that this database has never seen.
    // Not an error — they are created on first send, or by the server's boot
    // seed — but it is the answer to "why is my new template not in the list?".
    const stored = new Set(plans.map((plan) => plan.slug));
    const unseeded = Object.keys(CATALOGUE_VARIABLES).filter((slug) => !stored.has(slug));
    if (unseeded.length > 0 && ONLY.size === 0) {
      console.log(`\n${unseeded.length} catalogued template(s) not in this database yet:`);
      console.log(`  ${unseeded.sort((a, b) => a.localeCompare(b)).join(', ')}`);
      console.log('  Start the server once — `emailTemplateService.seedDefaults` creates them.');
    }
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

export { planTemplate, mergeVariables, targetFragment };
