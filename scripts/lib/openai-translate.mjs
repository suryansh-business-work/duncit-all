/**
 * Machine-translates UI strings with OpenAI, a BATCH per request.
 *
 * One request per string would be thousands of round trips for a full
 * catalogue, so a chunk of strings goes up as a single JSON object and comes
 * back as one — the model sees the neighbouring copy as context, which also
 * makes the tone consistent across a screen.
 *
 * Two things this module refuses to do quietly:
 *   - a chunk that fails takes only itself down; the rest are still returned
 *   - a translation whose {placeholders} changed is DROPPED, not written. A
 *     corrupted placeholder renders as literal `{count}` (or vanishes) in front
 *     of a user, and nobody would notice until they read that language.
 *
 * The API key is passed in by the caller from the environment and is never
 * logged, never stored, and never part of an error message.
 */

const DEFAULT_ENDPOINT = "https://api.openai.com/v1";
/** Same default the server's own AI calls use (`ai.resolver.ts`). */
export const DEFAULT_MODEL = "gpt-4o-mini";
export const DEFAULT_CHUNK_SIZE = 40;
const REQUEST_TIMEOUT_MS = 120_000;

/** The placeholder shape the runtime translator substitutes (packages/i18n). */
const PLACEHOLDER = /\{(\w+)\}/g;

/** The `{name}` tokens in a string, sorted, so two strings can be compared. */
export function placeholderNames(text) {
  return [...String(text).matchAll(PLACEHOLDER)]
    .map((match) => match[1] ?? '')
    .sort((a, b) => a.localeCompare(b));
}

function samePlaceholders(source, translated) {
  const before = placeholderNames(source);
  const after = placeholderNames(translated);
  return (
    before.length === after.length && before.every((n, i) => n === after[i])
  );
}

/** Split into batches small enough to stay well inside a request's token budget. */
export function chunkEntries(entries, size) {
  const chunks = [];
  for (let i = 0; i < entries.length; i += size) {
    chunks.push(entries.slice(i, i + size));
  }
  return chunks;
}

const SYSTEM_PROMPT = [
  "You translate user-interface strings for a mobile and web app.",
  "You receive a JSON object of id -> English text.",
  "Reply with a JSON object using EXACTLY the same ids, whose values are the translations.",
  "Rules:",
  "- Keep every {placeholder} token exactly as written: same spelling, same braces, never translated, never removed, never added.",
  "- Keep the register short and neutral, the way app labels and buttons read.",
  "- Preserve leading and trailing punctuation.",
  "- Translate the text only. Never answer it, explain it, or add commentary.",
].join("\n");

async function requestChunk(config, batch) {
  const payload = Object.fromEntries(batch.map((e) => [e.key, e.value]));
  const instruction = `Target language: ${config.localeLabel} (${config.locale}).`;
  const res = await fetch(`${config.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `${instruction}\n\n${JSON.stringify(payload)}` },
      ],
    }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!res.ok) {
    const detail = (await res.text()).slice(0, 300).replace(/\s+/g, " ");
    throw new Error(`OpenAI answered ${res.status} ${res.statusText}: ${detail}`);
  }
  const body = await res.json();
  const content = body.choices?.[0]?.message?.content;
  if (!content) throw new Error("OpenAI returned an empty response");
  return JSON.parse(content);
}

/** Sort one answered string into "use it" or "skip it, and say why". */
function collect(entry, answer, accepted, skipped) {
  const text = answer?.[entry.key];
  if (typeof text !== "string" || text.trim() === "") {
    skipped.push({ key: entry.key, reason: "no translation returned" });
    return;
  }
  if (!samePlaceholders(entry.value, text)) {
    skipped.push({ key: entry.key, reason: "placeholders changed" });
    return;
  }
  accepted.set(entry.key, text.trim());
}

/**
 * Translate `entries` ({ key, value }) into one locale.
 *
 * Returns what succeeded plus everything that did not, so the caller can write
 * the good rows and still report the rest honestly rather than claiming a
 * complete language.
 */
export async function translateEntries(config) {
  const {
    entries,
    chunkSize = DEFAULT_CHUNK_SIZE,
    baseUrl = DEFAULT_ENDPOINT,
    model = DEFAULT_MODEL,
    onChunk,
  } = config;
  const settings = { ...config, baseUrl, model };

  const accepted = new Map();
  const skipped = [];
  const failures = [];
  const chunks = chunkEntries(entries, chunkSize);

  let index = 0;
  for (const batch of chunks) {
    index += 1;
    onChunk?.(index, chunks.length, batch.length);
    let answer;
    try {
      answer = await requestChunk(settings, batch);
    } catch (error) {
      // One bad chunk must not cost the other chunks their translations.
      failures.push({ chunk: index, size: batch.length, message: error.message });
      continue;
    }
    for (const entry of batch) collect(entry, answer, accepted, skipped);
  }

  return { accepted, skipped, failures };
}
