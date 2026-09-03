import { GraphQLError } from "graphql";
import { logs } from "@observability/log";
import { LocaleModel, TranslationModel } from "./localization.model";
import { localizationService } from "./localization.service";
import { AutoTranslateJobModel, type IAutoTranslateJob } from "./autoTranslate.model";
import {
  BATCH_CONCURRENCY,
  BATCH_SIZE,
  translateBatch,
  type BatchResult,
  type TranslatableEntry,
  type TranslatedEntry,
} from "./autoTranslate.runner";

/**
 * Auto-translation: fill a locale in from the default one, through OpenAI.
 *
 * A language added in Admin > Localization > Locales starts empty, and typing
 * ~11,000 strings by hand is why locales were added and then never used.
 * Pressing Auto-translate walks the catalogue in batches and writes
 * `values.<code>` on each key — the SAME field the admin's own editor writes,
 * so nothing downstream needs to know a machine filled it: `publicTranslations`
 * already serves that field to mWeb, the native app, every portal and the
 * websites.
 *
 * The run is a background job (see the model). Re-running with "only the gaps"
 * is also the repair path: anything a batch failed on is still missing, so a
 * second press picks up exactly that and nothing else.
 */

/** A RUNNING row whose heartbeat is older than this was killed with the process. */
const STALE_MS = 3 * 60 * 1000;

const badInput = (message: string) =>
  new GraphQLError(message, { extensions: { code: "BAD_USER_INPUT" } });

const iso = (value: Date | null | undefined) => value?.toISOString() ?? null;

const jobToPub = (doc: IAutoTranslateJob) => ({
  id: doc._id.toString(),
  locale: doc.locale,
  source_locale: doc.source_locale ?? "",
  status: doc.status,
  replace_existing: !!doc.replace_existing,
  total_keys: doc.total_keys ?? 0,
  done_keys: doc.done_keys ?? 0,
  translated_keys: doc.translated_keys ?? 0,
  failed_keys: doc.failed_keys ?? 0,
  ai_model: doc.ai_model ?? "",
  error: doc.error ?? "",
  started_by: doc.started_by ?? "",
  started_at: iso(doc.started_at),
  finished_at: iso(doc.finished_at),
});

export type PublicAutoTranslateJob = ReturnType<typeof jobToPub>;

/** Keys carrying source text that this run should send. */
function pendingFilter(source: string, target: string, replaceExisting: boolean) {
  const filter: Record<string, unknown> = { [`values.${source}`]: { $nin: ["", null] } };
  // A missing Map entry compares as null, so this reads "absent or blank".
  if (!replaceExisting) filter[`values.${target}`] = { $in: [null, ""] };
  return filter;
}

async function collectPending(
  source: string,
  target: string,
  replaceExisting: boolean,
): Promise<TranslatableEntry[]> {
  const docs = await TranslationModel.find(pendingFilter(source, target, replaceExisting))
    .select({ key: 1, [`values.${source}`]: 1 })
    .lean();
  const entries: TranslatableEntry[] = [];
  for (const doc of docs as unknown as { key: string; values?: Record<string, string> }[]) {
    const text = (doc.values?.[source] ?? "").trim();
    if (text !== "") entries.push({ key: doc.key, text });
  }
  return entries;
}

function chunk<T>(items: T[], size: number): T[][] {
  const batches: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    batches.push(items.slice(index, index + size));
  }
  return batches;
}

/** The translated text, onto the same field the admin's editor writes. */
async function writeValues(locale: string, rows: TranslatedEntry[]): Promise<void> {
  if (rows.length === 0) return;
  await TranslationModel.bulkWrite(
    rows.map(({ key, value }) => ({
      updateOne: { filter: { key }, update: { $set: { [`values.${locale}`]: value } } },
    })),
  );
}

async function stillRunning(jobId: unknown): Promise<boolean> {
  const doc = await AutoTranslateJobModel.findById(jobId).select("status").lean();
  return doc?.status === "RUNNING";
}

/** One wave's totals, folded out of its batch results. */
function foldWave(wave: TranslatableEntry[][], results: BatchResult[]) {
  const written: TranslatedEntry[] = [];
  let done = 0;
  let failed = 0;
  let aiModel = "";
  let error = "";

  results.forEach((result, index) => {
    const size = wave[index].length;
    done += size;
    if (result.ok) {
      written.push(...result.written);
      failed += result.failed;
      aiModel = result.ai_model;
    } else {
      failed += size;
      error = result.message;
    }
  });

  return { written, done, failed, aiModel, error };
}

/** Write one wave's translations, then its progress onto the job row. */
async function applyWave(
  job: IAutoTranslateJob,
  wave: TranslatableEntry[][],
  results: BatchResult[],
): Promise<void> {
  const { written, done, failed, aiModel, error } = foldWave(wave, results);
  await writeValues(job.locale, written);

  const set: Record<string, unknown> = { heartbeat_at: new Date() };
  if (aiModel) set.ai_model = aiModel;
  if (error) set.error = error;
  await AutoTranslateJobModel.updateOne(
    { _id: job._id },
    { $inc: { done_keys: done, translated_keys: written.length, failed_keys: failed }, $set: set },
  );
}

async function closeJob(jobId: unknown, status: string, error?: string): Promise<void> {
  const doc = await AutoTranslateJobModel.findById(jobId);
  // Cancelled while the last wave was in flight: that decision stands.
  if (doc?.status !== "RUNNING") return;
  doc.status = status as IAutoTranslateJob["status"];
  if (error) doc.error = error;
  doc.finished_at = new Date();
  doc.heartbeat_at = new Date();
  await doc.save();
}

/**
 * A run that translated nothing at all is a failure however many batches it
 * attempted — the admin pressed a button and the language is still empty.
 */
async function finishRun(jobId: unknown): Promise<void> {
  const doc = await AutoTranslateJobModel.findById(jobId)
    .select("total_keys translated_keys")
    .lean();
  const nothingLanded = (doc?.total_keys ?? 0) > 0 && (doc?.translated_keys ?? 0) === 0;
  await closeJob(jobId, nothingLanded ? "FAILED" : "SUCCEEDED");
}

interface RunContext {
  language: string;
  sourceLanguage: string;
}

async function runJob(
  job: IAutoTranslateJob,
  entries: TranslatableEntry[],
  ctx: Readonly<RunContext>,
): Promise<void> {
  const batches = chunk(entries, BATCH_SIZE);
  for (let index = 0; index < batches.length; index += BATCH_CONCURRENCY) {
    if (!(await stillRunning(job._id))) return;
    const wave = batches.slice(index, index + BATCH_CONCURRENCY);
    const results = await Promise.all(
      wave.map((batch) =>
        translateBatch({
          entries: batch,
          language: ctx.language,
          languageCode: job.locale,
          sourceLanguage: ctx.sourceLanguage,
        }),
      ),
    );
    // A missing API key cannot come right on the next batch, so stop rather
    // than burn through three hundred identical failures.
    const fatal = results.find((result) => !result.ok && result.fatal);
    if (fatal && !fatal.ok) {
      await closeJob(job._id, "FAILED", fatal.message);
      return;
    }
    await applyWave(job, wave, results);
  }
  await finishRun(job._id);
}

/** How a locale is named to the model — its English name, else its own. */
const languageName = (doc: { english_label?: string; label: string; code: string }) =>
  (doc.english_label ?? "").trim() || doc.label.trim() || doc.code;

export const autoTranslateService = {
  /** How much of the catalogue each active locale carries text for. */
  async coverage() {
    const locales = await LocaleModel.find({ is_active: true })
      .sort({ sort_order: 1, code: 1 })
      .select("code")
      .lean();
    const total = await TranslationModel.countDocuments({});
    return Promise.all(
      locales.map(async (locale) => ({
        locale: locale.code,
        total_keys: total,
        translated_keys: await TranslationModel.countDocuments({
          [`values.${locale.code}`]: { $nin: ["", null] },
        }),
      })),
    );
  },

  /** Keys a run would send right now — what the confirm dialog quotes. */
  async pendingCount(locale: string, replaceExisting: boolean) {
    const source = await localizationService.defaultLocaleCode();
    if (!source) return 0;
    return TranslationModel.countDocuments(
      pendingFilter(source, (locale ?? "").trim(), replaceExisting),
    );
  },

  async latestJob(locale: string) {
    const doc = await AutoTranslateJobModel.findOne({ locale: (locale ?? "").trim() }).sort({
      started_at: -1,
    });
    return doc ? jobToPub(doc) : null;
  },

  async recentJobs(limit = 20) {
    const docs = await AutoTranslateJobModel.find().sort({ started_at: -1 }).limit(limit);
    return docs.map(jobToPub);
  },

  /**
   * Close a RUNNING row the process died under, so the language is startable
   * again. Returns the run when it is genuinely still alive.
   */
  async reapStale(locale: string) {
    const running = await AutoTranslateJobModel.findOne({ locale, status: "RUNNING" }).sort({
      started_at: -1,
    });
    if (!running) return null;
    const beat = running.heartbeat_at?.getTime() ?? 0;
    if (Date.now() - beat < STALE_MS) return running;
    running.status = "FAILED";
    running.error = "The server restarted mid-run. Start it again to carry on from where it stopped.";
    running.finished_at = new Date();
    await running.save();
    return null;
  },

  async start(input: { locale: string; replace_existing?: boolean | null; userId?: string | null }) {
    const code = (input.locale ?? "").trim();
    const target = await LocaleModel.findOne({ code });
    if (!target) throw badInput("That language is not set up yet");

    const sourceCode = await localizationService.defaultLocaleCode();
    if (!sourceCode) throw badInput("Set a default language first — it is what gets translated");
    if (sourceCode === code) {
      throw badInput(
        "This is the default language, so it is the source everything else is translated from",
      );
    }
    const source = await LocaleModel.findOne({ code: sourceCode });
    if (!source) throw badInput("The default language is missing");

    if (await this.reapStale(code)) {
      throw badInput("A translation run is already going for this language");
    }

    const replaceExisting = input.replace_existing === true;
    const pending = await collectPending(sourceCode, code, replaceExisting);
    const job = await AutoTranslateJobModel.create({
      locale: code,
      source_locale: sourceCode,
      status: "RUNNING",
      replace_existing: replaceExisting,
      total_keys: pending.length,
      started_by: input.userId ?? "",
    });

    // Fire and forget: the catalogue takes minutes, and the browser that asked
    // must be free to close. Progress lives on the row, not in this request.
    runJob(job, pending, {
      language: languageName(target),
      sourceLanguage: languageName(source),
    }).catch((error) => {
      logs.server.error("localization", "autoTranslate", { error });
      closeJob(job._id, "FAILED", "The run stopped unexpectedly").catch(() => undefined);
    });

    return jobToPub(job);
  },

  async cancel(id: string) {
    const doc = await AutoTranslateJobModel.findById((id ?? "").trim());
    if (!doc) throw badInput("That run no longer exists");
    if (doc.status === "RUNNING") {
      doc.status = "CANCELLED";
      doc.finished_at = new Date();
      await doc.save();
    }
    return jobToPub(doc);
  },
};
