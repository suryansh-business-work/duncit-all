/**
 * Migrate onboarding surveys from "one global survey per kind" to the new
 * category-scoped model.
 *
 * What changed (see survey.model.ts):
 *  - `surveys`: dropped the unique index on `kind`; added a compound unique
 *    index on `(kind, super_category_id, category_id, sub_category_id)`. Legacy
 *    surveys keep their scope fields null → they become the kind-level default.
 *  - `surveyresponses`: added `survey_id`; the unique index moved from
 *    `(user_id, kind)` to `(user_id, survey_id)`.
 *
 * This script:
 *  1. Drops the stale `kind_1` (surveys) and `user_id_1_kind_1` (responses)
 *     unique indexes Mongoose won't drop on its own.
 *  2. Backfills `survey_id` on every response from the kind-default survey.
 *     Orphan responses (no survey for their kind) are removed so the new unique
 *     index can build.
 *  3. Runs syncIndexes() to build the new compound indexes.
 *
 * Idempotent; safe to re-run.
 *
 * Run:
 *   npm run migrate:survey-scope
 *   npm run migrate:survey-scope -- --dry-run
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../src/config/db';
import { SurveyModel, SurveyResponseModel } from '../src/modules/survey/survey.model';

const dryRun = process.argv.includes('--dry-run');
const log = (...m: unknown[]) => console.log('[migrate-survey-scope]', ...m);

/** Drop an index by name if it exists, tolerating "index not found". */
async function dropIndexIfExists(collection: mongoose.Collection, name: string) {
  const existing = await collection.indexes().catch(() => [] as any[]);
  const found = existing.find((i: any) => i.name === name);
  if (!found) return;
  log(`drop stale index: ${name} ${JSON.stringify(found.key)}`);
  if (!dryRun) await collection.dropIndex(name).catch((e) => log(`  (skip) ${e.message}`));
}

async function run() {
  await connectDB();
  log(`mode: ${dryRun ? 'DRY-RUN' : 'WRITE'}`);

  // 1) Drop legacy unique indexes that block the new shape.
  await dropIndexIfExists(SurveyModel.collection, 'kind_1');
  await dropIndexIfExists(SurveyResponseModel.collection, 'user_id_1_kind_1');

  // 2) Backfill survey_id on responses from the kind-default survey.
  // Default = the legacy survey for a kind with all scope fields null; fall back
  // to any survey for that kind if none is explicitly null-scoped.
  const surveys = await SurveyModel.find({}).select('kind super_category_id category_id sub_category_id').lean();
  const defaultByKind = new Map<string, any>();
  for (const s of surveys as any[]) {
    const isDefault = !s.super_category_id && !s.category_id && !s.sub_category_id;
    if (isDefault || !defaultByKind.has(s.kind)) defaultByKind.set(s.kind, s);
  }
  log('kind defaults:', [...defaultByKind.entries()].map(([k, s]) => `${k}→${s._id}`).join(', ') || 'none');

  const pending = await SurveyResponseModel.find({ survey_id: { $in: [null, undefined] } }).lean();
  log(`responses needing survey_id: ${pending.length}`);
  let backfilled = 0;
  let orphaned = 0;
  for (const r of pending as any[]) {
    const def = defaultByKind.get(r.kind);
    if (!def) {
      orphaned += 1;
      if (!dryRun) await SurveyResponseModel.deleteOne({ _id: r._id });
      continue;
    }
    backfilled += 1;
    if (!dryRun) await SurveyResponseModel.updateOne({ _id: r._id }, { $set: { survey_id: def._id } });
  }
  log(`backfilled: ${backfilled}, removed orphans: ${orphaned}`);

  // 3) Build the new compound indexes.
  if (dryRun) {
    log('dry-run: skipping syncIndexes()');
  } else {
    log('survey syncIndexes dropped:', await SurveyModel.syncIndexes().catch(() => []));
    log('response syncIndexes dropped:', await SurveyResponseModel.syncIndexes().catch(() => []));
  }

  await mongoose.disconnect();
  log('done.');
}

run().catch((e) => {
  console.error('[migrate-survey-scope] failed', e);
  process.exit(1);
});
