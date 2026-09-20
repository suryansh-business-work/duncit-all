import { BackgroundJobModel, type JobRowFailure, type LeanBackgroundJob } from '@modules/platform/backgroundJob/backgroundJob.model';
import { LocaleModel, TranslationModel } from './localization.model';
import { pendingFilter, type AiTranslateScope } from './aiTranslate.scope';
import {
  BATCH_CONCURRENCY,
  BATCH_SIZE,
  translateBatch,
  type BatchResult,
  type TranslatableEntry,
  type TranslatedEntry,
} from './autoTranslate.runner';

/**
 * One AI_TRANSLATE step for the background runner: the next wave of keys after
 * `cursor`, translated and written, then the counts and the new cursor.
 *
 * Keys are walked in `key` order and the cursor is the last key handled, so a
 * restart resumes exactly where the previous process stopped, and a key the
 * model returned nothing usable for is not asked for again in the same run —
 * it stays untranslated and counted, and the next "sync" run retries it.
 */

/** What the job row carries for this kind (see aiTranslate.service `start`). */
export interface AiTranslateParams {
  locale: string;
  source_locale: string;
  /** The target language in words, as the prompt names it. */
  language: string;
  source_language: string;
  scope: AiTranslateScope;
  surface: string;
  page: string;
}

const WAVE_SIZE = BATCH_SIZE * BATCH_CONCURRENCY;
const FAILURES_KEPT = 20;

/**
 * OpenAI requests in flight across EVERY running translation job in this
 * process. Several languages at once must not multiply the load: the limit a
 * single run was tuned to is the limit for all of them together.
 */
let inFlight = 0;
const waiting: Array<() => void> = [];

async function acquireSlot(): Promise<void> {
  if (inFlight < BATCH_CONCURRENCY) {
    inFlight += 1;
    return;
  }
  // Released slots are handed straight to the next waiter, never back to the pool.
  await new Promise<void>((resolve) => waiting.push(resolve));
}

function releaseSlot(): void {
  const next = waiting.shift();
  if (next) next();
  else inFlight -= 1;
}

async function withSlot<T>(task: () => Promise<T>): Promise<T> {
  await acquireSlot();
  try {
    return await task();
  } finally {
    releaseSlot();
  }
}

function chunk<T>(items: readonly T[], size: number): T[][] {
  const batches: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    batches.push(items.slice(index, index + size));
  }
  return batches;
}

async function nextWave(params: AiTranslateParams, cursor: unknown): Promise<TranslatableEntry[]> {
  const filter = pendingFilter(params.source_locale, params.locale, params.scope, params);
  if (typeof cursor === 'string') filter.key = { $gt: cursor };
  const docs = await TranslationModel.find(filter)
    .sort({ key: 1 })
    .limit(WAVE_SIZE)
    .select({ key: 1, [`values.${params.source_locale}`]: 1 })
    .lean();
  return (docs as unknown as { key: string; values?: Record<string, string> }[]).map((doc) => ({
    key: doc.key,
    text: (doc.values?.[params.source_locale] ?? '').trim(),
  }));
}

/** The translations, onto the field every surface reads — with the text they came from. */
async function writeValues(params: AiTranslateParams, entries: TranslatableEntry[], rows: TranslatedEntry[]) {
  if (rows.length === 0) return;
  const sourceOf = new Map(entries.map((entry) => [entry.key, entry.text]));
  await TranslationModel.bulkWrite(
    rows.map(({ key, value }) => ({
      updateOne: {
        filter: { key },
        update: {
          $set: {
            [`values.${params.locale}`]: value,
            [`synced_from.${params.locale}`]: sourceOf.get(key) ?? '',
          },
        },
      },
    })),
  );
}

/** One wave's totals, folded out of its batch results. */
function foldWave(batches: TranslatableEntry[][], results: BatchResult[]) {
  const written: TranslatedEntry[] = [];
  const failures: JobRowFailure[] = [];
  let failed = 0;
  results.forEach((result, index) => {
    const batch = batches[index];
    if (result.ok) {
      written.push(...result.written);
      failed += result.failed;
      return;
    }
    failed += batch.length;
    failures.push({ id: batch[0].key, message: result.message });
  });
  return { written, failed, failures };
}

/** Translate the next wave. False when no key in scope is left. */
export async function translateNextWave(job: LeanBackgroundJob): Promise<boolean> {
  const params = job.params as unknown as AiTranslateParams;
  // A language removed mid-run has nowhere to put its text any more.
  if (!(await LocaleModel.exists({ code: params.locale }))) {
    throw new Error('This language was removed while it was being translated.');
  }
  const entries = await nextWave(params, job.cursor);
  const last = entries.at(-1);
  if (!last) return false;

  const batches = chunk(entries, BATCH_SIZE);
  const results = await Promise.all(
    batches.map((batch) =>
      withSlot(() =>
        translateBatch({
          entries: batch,
          language: params.language,
          languageCode: params.locale,
          sourceLanguage: params.source_language,
        }),
      ),
    ),
  );
  // A missing API key cannot come right on the next wave, so the job stops
  // here rather than burning through the catalogue failing.
  const fatal = results.find((result) => !result.ok && result.fatal);
  if (fatal && !fatal.ok) throw new Error(fatal.message);

  const { written, failed, failures } = foldWave(batches, results);
  await writeValues(params, entries, written);
  await BackgroundJobModel.updateOne(
    { _id: job._id },
    {
      $inc: { succeeded: written.length, failed },
      $set: { cursor: last.key },
      $push: { failures: { $each: failures, $slice: FAILURES_KEPT } },
    },
  );
  return true;
}
