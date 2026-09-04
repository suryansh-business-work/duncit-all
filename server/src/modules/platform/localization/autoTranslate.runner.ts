import { openaiChat } from "@services/openai/openai.client";
import { resolvePrompt } from "@modules/ai/prompt/prompt.service";

/**
 * ONE batch of keys, translated by OpenAI and checked before it is trusted.
 *
 * Kept apart from the job bookkeeping because this is the only part that talks
 * to the model, and it is the part with a rule of its own: a translation that
 * dropped a `{placeholder}` is WORSE than no translation. The token is
 * substituted at render time, so "{count} spots left" coming back without
 * `{count}` reads as a complete sentence in the admin and renders a missing
 * number on every phone. Those are rejected here and counted as failures, which
 * a later run picks up again — never written and never silently accepted.
 */

/** The `{name}` tokens @duncit/i18n substitutes at render time. */
const PLACEHOLDER = /\{(\w+)\}/g;

/**
 * Keys per request. Small enough that a reply cannot run past `MAX_TOKENS` —
 * a truncated answer is unparseable JSON, which loses the whole batch — and
 * large enough that the catalogue does not cost ~11,000 round trips.
 */
export const BATCH_SIZE = 30;

/** Batches in flight at once. Four keeps a full language inside ten minutes
 * without pushing a normal account into rate limiting. */
export const BATCH_CONCURRENCY = 4;

const MAX_TOKENS = 4000;

export interface TranslatableEntry {
  key: string;
  /** The default locale's text — what gets translated. */
  text: string;
}

export interface TranslatedEntry {
  key: string;
  value: string;
}

interface BatchSuccess {
  ok: true;
  written: TranslatedEntry[];
  /** Keys the model returned nothing usable for. */
  failed: number;
  ai_model: string;
}

interface BatchFailure {
  ok: false;
  /** True when no later batch can succeed either — a missing key, not a blip. */
  fatal: boolean;
  message: string;
}

export type BatchResult = BatchSuccess | BatchFailure;

/** The placeholder names in a string, sorted — two strings agree iff these match. */
export function placeholderFingerprint(text: string): string {
  const found = new Set<string>();
  for (const match of text.matchAll(PLACEHOLDER)) found.add(match[1]);
  return [...found].sort((a, b) => a.localeCompare(b)).join("|");
}

/** The translated text, or null when it cannot be trusted. */
function usableTranslation(source: string, raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const value = raw.trim();
  if (value === "") return null;
  if (placeholderFingerprint(value) !== placeholderFingerprint(source)) return null;
  return value;
}

/** The `translations` object out of the model's reply, or null if it isn't one. */
function parseTranslations(content: string): Map<string, unknown> | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    return null;
  }
  const table = (parsed as { translations?: unknown } | null)?.translations;
  if (!table || typeof table !== "object" || Array.isArray(table)) return null;
  // A Map rather than property lookup: the keys came from a model, so
  // `{"constructor": "…"}` would otherwise resolve against Object.prototype.
  return new Map(Object.entries(table as Record<string, unknown>));
}

export interface BatchInput {
  entries: TranslatableEntry[];
  /** Target language in words, e.g. "Hindi (India)" — what the prompt names. */
  language: string;
  languageCode: string;
  sourceLanguage: string;
}

export async function translateBatch(input: Readonly<BatchInput>): Promise<BatchResult> {
  const payload = JSON.stringify(Object.fromEntries(input.entries.map((e) => [e.key, e.text])));
  const [system, user] = await Promise.all([
    resolvePrompt("localization.auto_translate", {
      language: input.language,
      language_code: input.languageCode,
      source_language: input.sourceLanguage,
    }),
    resolvePrompt("localization.auto_translate.user", { entries: payload }),
  ]);

  const res = await openaiChat({
    task: "localization.auto_translate",
    messages: [
      { role: "system", content: system.content },
      { role: "user", content: user.content },
    ],
    model: system.model,
    temperature: 0.2,
    json: true,
    max_tokens: MAX_TOKENS,
    detail: `${input.languageCode} · ${input.entries.length} keys`,
  });

  if (!res.ok) {
    return { ok: false, fatal: res.code === "NOT_CONFIGURED", message: res.message };
  }

  const table = parseTranslations(res.content);
  if (!table) {
    return { ok: false, fatal: false, message: "OpenAI did not answer with the expected JSON" };
  }

  const written: TranslatedEntry[] = [];
  for (const entry of input.entries) {
    const value = usableTranslation(entry.text, table.get(entry.key));
    if (value !== null) written.push({ key: entry.key, value });
  }
  return { ok: true, written, failed: input.entries.length - written.length, ai_model: res.model };
}
