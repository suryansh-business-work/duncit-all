/**
 * Move every email template's header and footer into its category fragment.
 *
 *   npm run migrate:email-fragments:dry     # report only, touches nothing
 *   npm run migrate:email-fragments         # write to the database
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
import mongoose from 'mongoose';
import { EMAIL_CATEGORIES } from '@services/email/email.provider';
import {
  connectTemplateFragments,
  fragmentKeys,
  type FragmentPlanRow,
} from '@modules/content/emailTemplate/emailTemplate.chrome';

// The planning logic lives in the server module, so boot and the Communications
// portal run exactly what this script runs.

/** `--flag=value` or `--flag value`, whichever the operator typed. */
function argValue(flag: string): string | null {
  const inline = process.argv.find((arg) => arg.startsWith(`${flag}=`));
  if (inline) return inline.slice(flag.length + 1).trim() || null;
  const index = process.argv.indexOf(flag);
  const next = index === -1 ? '' : (process.argv[index + 1] ?? '');
  return next && !next.startsWith('-') ? next.trim() : null;
}

const DRY = process.argv.includes('--dry-run');
/** The fragment an admin's own template gets when it names none. */
const ASSIGN_UNMAPPED = argValue('--assign-unmapped');

function report(rows: FragmentPlanRow[]): void {
  const width = Math.max(...rows.map((r) => r.slug.length), 4);
  for (const row of rows) {
    const note = row.note.length > 58 ? `${row.note.slice(0, 55)}…` : row.note;
    console.log(
      `  ${row.slug.padEnd(width)}  ${row.category.padEnd(14)}  ${row.action.padEnd(10)}  ${note}`
    );
  }
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

async function main(): Promise<void> {
  console.log(DRY ? 'DRY RUN — nothing is written\n' : 'Writing changes\n');

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
    const { rows } = await connectTemplateFragments({ fallback: ASSIGN_UNMAPPED, dryRun: DRY });
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
