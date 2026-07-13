/**
 * Re-sync the transactional-email logo on every EmailTemplate doc already
 * cached in the database.
 *
 * The disk templates now reference the logo via `{{brand_logo_url}}` at a
 * smaller `width="110px"`, but emailTemplate.service caches each template in
 * Mongo on first send and never re-reads disk afterward. So templates already
 * cached carry the old hardcoded `src="https://duncit.com/duncit-logo.svg"`
 * at `width="160px"`. This script surgically updates those docs in place:
 *
 *   - `src="https://duncit.com/duncit-logo.svg"` -> `src="{{brand_logo_url}}"`
 *   - the logo image's `width="160px"` -> `width="110px"`
 *   - ensures `brand_logo_url` is present in the doc's `variables` array
 *
 * Idempotent: only writes when something changed. Best-effort: a single bad
 * doc is logged and skipped, never thrown. Logs a summary at the end.
 *
 * Run:
 *   npm run migrate:email-logo
 *   npm run migrate:email-logo:dry
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../src/config/db';
import { EmailTemplateModel, type IEmailTemplate } from '../src/modules/content/emailTemplate/emailTemplate.model';

const dryRun = process.argv.includes('--dry-run');
const log = (...m: unknown[]) => console.log('[migrate-email-logo]', ...m);

const LEGACY_LOGO_SRC = 'src="https://duncit.com/duncit-logo.svg"';
const NEW_LOGO_SRC = 'src="{{brand_logo_url}}"';
const OLD_WIDTH = 'width="160px"';
const NEW_WIDTH = 'width="110px"';

/**
 * Rewrite a single logo `<mj-image …/>` tag: swap its src to the brand var and
 * shrink its width. Width is only touched on the image tag that carries the
 * logo src so other 160px images (if any) are left alone.
 */
function rewriteMjml(mjml: string): string {
  // Global literal replace without ES2021 `replaceAll` (tsconfig lib).
  let out = mjml.split(LEGACY_LOGO_SRC).join(NEW_LOGO_SRC);
  out = out.replace(
    /<mj-image\s+src="\{\{brand_logo_url\}\}"[^>]*?>/g,
    (tag) => tag.replace(OLD_WIDTH, NEW_WIDTH)
  );
  return out;
}

function hasBrandLogoVar(variables: { key?: string }[] | undefined): boolean {
  return (variables ?? []).some((v) => v?.key === 'brand_logo_url');
}

/** Apply the logo rewrite + brand-var patch to one doc in place. Returns whether
 * anything changed (false = nothing to do, doc left untouched). */
function applyLogoFix(doc: IEmailTemplate): boolean {
  const nextMjml = rewriteMjml(doc.mjml ?? '');
  const mjmlChanged = nextMjml !== doc.mjml;
  const needsVar = !hasBrandLogoVar(doc.variables);
  if (!mjmlChanged && !needsVar) return false;
  if (mjmlChanged) doc.mjml = nextMjml;
  if (needsVar) doc.variables = [...(doc.variables ?? []), { key: 'brand_logo_url' }];
  log(`update ${doc.slug} (mjml=${mjmlChanged}, var=${needsVar})`);
  return true;
}

async function run() {
  await connectDB();
  log(`mode: ${dryRun ? 'DRY-RUN' : 'WRITE'}`);

  const docs = await EmailTemplateModel.find();
  log(`templates in DB: ${docs.length}`);

  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const doc of docs) {
    try {
      if (!applyLogoFix(doc)) {
        skipped += 1;
        continue;
      }
      updated += 1;
      if (!dryRun) await doc.save();
    } catch (e) {
      failed += 1;
      log(`failed ${doc?.slug ?? doc?._id}:`, e instanceof Error ? e.message : e);
    }
  }

  log(`updated: ${updated}, skipped: ${skipped}, failed: ${failed}`);
  await mongoose.disconnect();
  log('done.');
}

run().catch((e) => {
  console.error('[migrate-email-logo] failed', e);
  process.exit(1);
});
