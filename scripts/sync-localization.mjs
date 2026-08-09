#!/usr/bin/env node
/**
 * Syncs every shipped translation key into the platform's Localization store,
 * so Admin > Localization > Translations is populated instead of blank
 * (CLAUDE.md rule 38).
 *
 * The admin panel's "Import app keys" button does the same thing, but only when
 * somebody opens that page and presses it — which is why a fresh environment
 * shows an empty table. This is that operation as a command.
 *
 * What it sends:
 *   - every key in the client fallback catalogue (packages/i18n/src/bundles/)
 *   - every key the SERVER ships copy for (its MJML email templates)
 *
 * DIRECTION: the local code is the source of truth for the key list and for the
 * English text. Any other language's text is never touched — that lives in the
 * admin panel and in `--translate` below. Which means: change English in the
 * bundle, not in the admin table, or the next sync will push the code's copy
 * back over it.
 *
 * In dev this needs NO token and NO running server: with DUNCIT_ADMIN_TOKEN
 * unset it connects to the same database the API does. The ADMIN_WRITE guard on
 * `importTranslationKeys` is deliberately untouched — that mutation is
 * reachable in production.
 *
 * Run `node scripts/sync-localization.mjs --help` for the full usage.
 */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { catalogueEntries, serverEmailEntries } from "./lib/bundle-catalogue.mjs";
import {
  languageName,
  openGraphqlStore,
  openMongoStore,
} from "./lib/localization-store.mjs";
import {
  DEFAULT_CHUNK_SIZE,
  DEFAULT_MODEL,
  translateEntries,
} from "./lib/openai-translate.mjs";
import { serverEnv } from "./lib/server-env.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const NAME = "sync-localization";
/** How many skipped strings to name before summarising the rest. */
const SKIP_PREVIEW = 10;

const USAGE = `Usage: node scripts/sync-localization.mjs [options]

Pushes every shipped translation key (packages/i18n/src/bundles + the server's
email fallback) into the platform's Localization store. The local code is the
source of truth for the key list and the English text; every other language is
left alone.

Transport, chosen automatically:
  no DUNCIT_ADMIN_TOKEN   connect straight to MongoDB using the server's own
                          MONGO_URI. The dev path: no token, no running server.
  DUNCIT_ADMIN_TOKEN set  call importTranslationKeys on DUNCIT_GRAPHQL_URL, for
                          an environment whose database you cannot reach. That
                          mutation only CREATES keys, so English changes are not
                          pushed and --translate is unavailable.

Options:
  --translate=hi,ta   machine-translate, via OpenAI, every string those locales
                      have no text for. Needs OPENAI_API_KEY.
  --force             re-translate strings that already have text too.
  -h, --help          show this.

Environment:
  MONGO_URI                  the database to write to; read from the real
  MONGO_DB_NAME              environment first, then server/.env
  DUNCIT_ADMIN_TOKEN         admin bearer token; switches to the GraphQL path
  DUNCIT_GRAPHQL_URL         default http://localhost:2001/graphql
  DUNCIT_SEED_LOCALE         locale created when the store has none (default en)
  DUNCIT_TRANSLATE_LOCALES   same as --translate
  DUNCIT_TRANSLATE_CHUNK     strings per OpenAI request (default ${DEFAULT_CHUNK_SIZE})
  OPENAI_API_KEY             required only by --translate; never logged
  OPENAI_MODEL               default ${DEFAULT_MODEL}
  OPENAI_BASE_URL            default https://api.openai.com/v1`;

const splitLocales = (raw) =>
  raw
    .split(",")
    .map((code) => code.trim())
    .filter(Boolean);

function parseArgs(argv) {
  const options = { help: false, force: false, translate: [] };
  for (const arg of argv) {
    if (arg === "--help" || arg === "-h") options.help = true;
    else if (arg === "--force") options.force = true;
    else if (arg.startsWith("--translate="))
      options.translate = splitLocales(arg.slice("--translate=".length));
    else throw new Error(`unknown option "${arg}" — run with --help for usage`);
  }
  if (options.translate.length === 0) {
    options.translate = splitLocales(
      process.env.DUNCIT_TRANSLATE_LOCALES ?? "",
    );
  }
  return options;
}

/** The client catalogue plus the server's email copy, one entry per key. */
function shippedEntries() {
  const client = catalogueEntries(ROOT);
  const email = serverEmailEntries(ROOT);
  const merged = new Map();
  for (const entry of client) merged.set(entry.key, entry.value);
  for (const entry of email) merged.set(entry.key, entry.value);
  console.log(
    `${NAME}: ${client.length} client + ${email.length} server key(s) = ${merged.size} unique`,
  );
  return [...merged].map(([key, value]) => ({ key, value }));
}

function openStore(fallbackLocale) {
  const token = process.env.DUNCIT_ADMIN_TOKEN ?? "";
  if (!token) return openMongoStore(ROOT, fallbackLocale);
  const url = process.env.DUNCIT_GRAPHQL_URL ?? "http://localhost:2001/graphql";
  return openGraphqlStore(url, token, fallbackLocale);
}

function reportSkipped(code, skipped) {
  if (skipped.length === 0) return;
  console.warn(`${NAME}: ${code} — ${skipped.length} string(s) not written:`);
  for (const item of skipped.slice(0, SKIP_PREVIEW)) {
    console.warn(`  ${item.key}: ${item.reason}`);
  }
  const rest = skipped.length - SKIP_PREVIEW;
  if (rest > 0) console.warn(`  … and ${rest} more`);
}

/**
 * Everything `--translate` needs, resolved BEFORE any writing starts: a missing
 * key or the wrong transport should stop the run, not surface after the sync.
 */
function translationSettings(store) {
  if (!store.supportsTranslate) {
    throw new Error(
      "--translate needs the direct MongoDB path — unset DUNCIT_ADMIN_TOKEN (point MONGO_URI at the target environment)",
    );
  }
  const env = serverEnv(ROOT);
  const apiKey = env.get("OPENAI_API_KEY");
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY is not set — export it (or add it to server/.env) to use --translate",
    );
  }
  const chunk = Number.parseInt(process.env.DUNCIT_TRANSLATE_CHUNK ?? "", 10);
  return {
    apiKey,
    model: env.get("OPENAI_MODEL") || DEFAULT_MODEL,
    baseUrl: env.get("OPENAI_BASE_URL") || undefined,
    chunkSize: Number.isFinite(chunk) && chunk > 0 ? chunk : DEFAULT_CHUNK_SIZE,
  };
}

/** Translate one locale and write back only what verified clean. */
async function translateLocale(store, options, entries, code, settings) {
  const { created } = await store.ensureLocale(code);
  if (created) console.log(`${NAME}: created locale "${code}".`);

  const have = await store.existingValues(code);
  const pending = entries.filter(
    (entry) => options.force || (have.get(entry.key) ?? "").trim() === "",
  );
  if (pending.length === 0) {
    console.log(`${NAME}: ${code} already has text for all ${entries.length} keys.`);
    return;
  }

  console.log(
    `${NAME}: translating ${pending.length} string(s) into ${code} with ${settings.model}…`,
  );
  const { accepted, skipped, failures } = await translateEntries({
    ...settings,
    entries: pending,
    locale: code,
    localeLabel: languageName(code, "en"),
    onChunk: (index, total, size) =>
      console.log(`${NAME}: ${code} batch ${index}/${total} (${size} strings)`),
  });

  await store.writeValues(code, accepted);
  console.log(`${NAME}: ${code} — ${accepted.size} string(s) written.`);
  for (const failure of failures) {
    console.warn(
      `${NAME}: ${code} batch ${failure.chunk} failed (${failure.size} strings kept untranslated): ${failure.message}`,
    );
  }
  reportSkipped(code, skipped);
}

async function runTranslations(store, options, entries, sourceLocale, settings) {
  for (const code of options.translate) {
    if (code === sourceLocale) {
      console.log(`${NAME}: skipping "${code}" — it is the source language.`);
      continue;
    }
    await translateLocale(store, options, entries, code, settings);
  }
}

let store;
try {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(USAGE);
    process.exit(0);
  }

  const entries = shippedEntries();
  store = await openStore(process.env.DUNCIT_SEED_LOCALE ?? "en");
  console.log(`${NAME}: ${store.describe}`);
  const settings =
    options.translate.length > 0 ? translationSettings(store) : null;

  const locale = await store.defaultLocale();
  const { created, updated, unchanged } = await store.syncEnglish(locale, entries);
  console.log(
    `${NAME}: "${locale}" — ${created} created, ${updated} updated, ${unchanged} already present.`,
  );
  if (!store.supportsTranslate && unchanged > 0) {
    console.log(
      `${NAME}: the GraphQL path creates keys only — English edits are pushed by the direct MongoDB path.`,
    );
  }

  if (settings) {
    await runTranslations(store, options, entries, locale, settings);
  }
} catch (error) {
  // A stack trace here is noise: every realistic failure is operational (no
  // MONGO_URI, database unreachable, token without ADMIN_WRITE, OpenAI down),
  // and the message already says which one.
  console.error(`${NAME}: ${error.message}`);
  process.exitCode = 1;
} finally {
  await store?.close();
}
