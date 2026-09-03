import { Schema, model, type Document } from "mongoose";

/**
 * One auto-translation RUN — an admin asking OpenAI to fill a locale in.
 *
 * It is a document rather than in-memory state for the same reason a backup run
 * is: the catalogue is ~11,000 keys, so the work takes minutes, and the browser
 * that started it can be closed while it goes. Any client re-reads the same row,
 * and a second admin cannot start a duplicate run against the same language.
 *
 * `heartbeat_at` is what makes a server restart detectable — nothing ticks it
 * while the process is down, so a row still marked RUNNING with a stale
 * heartbeat is reported as interrupted rather than spinning on screen forever.
 */
export const AUTO_TRANSLATE_STATUSES = ["RUNNING", "SUCCEEDED", "FAILED", "CANCELLED"] as const;
export type AutoTranslateStatus = (typeof AUTO_TRANSLATE_STATUSES)[number];

export interface IAutoTranslateJob extends Document {
  /** Locale being filled in — the target language. */
  locale: string;
  /** The platform's default locale, whose text is translated FROM. */
  source_locale: string;
  status: AutoTranslateStatus;
  /**
   * Re-translate keys that already carry text, instead of only the gaps.
   * Not named `overwrite`: mongoose Documents already have a method by that
   * name, and a schema path that shadows one does not compile.
   */
  replace_existing: boolean;
  /** Keys this run set out to translate. */
  total_keys: number;
  /** Keys it has finished with, translated or not — what the progress bar reads. */
  done_keys: number;
  translated_keys: number;
  /** Keys the model returned nothing usable for. Re-running picks them up again. */
  failed_keys: number;
  /** The model that answered, as reported by the OpenAI client. */
  ai_model: string;
  error: string;
  started_by: string;
  started_at: Date;
  finished_at: Date | null;
  heartbeat_at: Date;
  created_at: Date;
  updated_at: Date;
}

const autoTranslateJobSchema = new Schema<IAutoTranslateJob>(
  {
    locale: { type: String, required: true, index: true },
    source_locale: { type: String, default: "" },
    status: { type: String, enum: AUTO_TRANSLATE_STATUSES, default: "RUNNING", index: true },
    replace_existing: { type: Boolean, default: false },
    total_keys: { type: Number, default: 0 },
    done_keys: { type: Number, default: 0 },
    translated_keys: { type: Number, default: 0 },
    failed_keys: { type: Number, default: 0 },
    ai_model: { type: String, default: "" },
    error: { type: String, default: "" },
    started_by: { type: String, default: "" },
    started_at: { type: Date, default: Date.now },
    finished_at: { type: Date, default: null },
    heartbeat_at: { type: Date, default: Date.now },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } },
);

autoTranslateJobSchema.index({ started_at: -1 });

export const AutoTranslateJobModel = model<IAutoTranslateJob>(
  "AutoTranslateJob",
  autoTranslateJobSchema,
);
