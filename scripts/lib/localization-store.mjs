/**
 * The two ways a script can write to the platform's Localization store.
 *
 * MONGO (the dev path) talks to the same database the API does, using the
 * server's own MONGO_URI. That is what makes syncing work with no token and no
 * server running — the alternative would have been weakening the ADMIN_WRITE
 * guard on `importTranslationKeys`, and that mutation is reachable in
 * production.
 *
 * GRAPHQL (the remote path) calls that guarded mutation with an admin token,
 * for an environment whose database you cannot reach. It is deliberately
 * create-only, because that is all the mutation does.
 *
 * Both return the same shape so the caller never branches on transport. The
 * document shapes below mirror `server/src/modules/platform/localization/
 * localization.model.ts` exactly — including the mongoose `__v` and the
 * `created_at`/`updated_at` timestamp names — so a row written here is
 * indistinguishable from one the API wrote.
 */
import { createRequire } from "node:module";
import { join } from "node:path";

import { serverEnv } from "./server-env.mjs";

/** Mongoose pluralizes its model names: `Locale` -> `locales`. */
const LOCALE_COLLECTION = "locales";
const TRANSLATION_COLLECTION = "translations";
/** A CLI should fail fast; the API's 60s retry loop is for a booting container. */
const CONNECT_TIMEOUT_MS = 15_000;

/** `mweb.shop.emptyState` -> surface "mweb", page "shop" (keySegments). */
function keySegments(key) {
  const parts = (key ?? "").split(".").filter(Boolean);
  return { surface: parts[0] ?? "", page: parts[1] ?? "" };
}

/** Never print credentials, even when the URI is only going to a terminal. */
export function redactMongoUri(uri) {
  return uri.replace(/\/\/[^/@]*@/, "//***@");
}

/** A language's own name, or its name in another language — from ICU, not a list. */
export function languageName(code, inLocale) {
  try {
    return new Intl.DisplayNames([inLocale], { type: "language" }).of(code) ?? code;
  } catch {
    return code;
  }
}

function isRightToLeft(code) {
  try {
    const locale = new Intl.Locale(code);
    const info = locale.getTextInfo?.() ?? locale.textInfo;
    return info?.direction === "rtl";
  } catch {
    return false;
  }
}

function localeDocument(code, isDefault) {
  const now = new Date();
  return {
    code,
    label: languageName(code, code),
    english_label: languageName(code, "en"),
    is_rtl: isRightToLeft(code),
    is_active: true,
    is_default: isDefault,
    sort_order: 0,
    created_at: now,
    updated_at: now,
    __v: 0,
  };
}

function translationDocument(entry, locale, now) {
  const { surface, page } = keySegments(entry.key);
  return {
    key: entry.key,
    surface,
    page,
    description: "",
    values: { [locale]: entry.value },
    created_at: now,
    updated_at: now,
    __v: 0,
  };
}

function loadMongoose(repoRoot) {
  // mongoose is a SERVER dependency and pnpm keeps workspaces isolated, so
  // resolve it from there rather than adding a copy at the repo root.
  const require = createRequire(join(repoRoot, "server", "package.json"));
  try {
    return require("mongoose");
  } catch {
    throw new Error(
      "mongoose could not be resolved from server/ — run `pnpm install --filter server` first",
    );
  }
}

/** Connect straight to the database the API uses. No token, no running server. */
export async function openMongoStore(repoRoot, fallbackLocale) {
  const env = serverEnv(repoRoot);
  const uri = env.get("MONGO_URI");
  if (!uri) {
    const where = env.path ?? join(repoRoot, "server", ".env");
    throw new Error(
      `MONGO_URI is not set — put it in ${where} (copy server/.env.example), export it, ` +
        "or set DUNCIT_ADMIN_TOKEN to sync over GraphQL instead",
    );
  }
  const mongoose = loadMongoose(repoRoot);
  const dbName = env.get("MONGO_DB_NAME");
  if (!dbName) {
    // Same warning the server prints on boot (config/db.ts): without it Mongo
    // uses the URI's default database — `test` on a bare SRV URI, which on a
    // shared cluster is the LIVE data. Writing keys there by accident is
    // exactly what this path makes easy.
    console.warn(
      "WARNING: MONGO_DB_NAME is not set — writing to the URI's default database " +
        "(usually `test`). On a shared cluster that is LIVE data.",
    );
  }
  const connection = await mongoose
    .createConnection(uri, {
      serverSelectionTimeoutMS: CONNECT_TIMEOUT_MS,
      connectTimeoutMS: CONNECT_TIMEOUT_MS,
      family: 4,
      ...(dbName ? { dbName } : {}),
    })
    .asPromise();

  const locales = connection.db.collection(LOCALE_COLLECTION);
  const translations = connection.db.collection(TRANSLATION_COLLECTION);
  const database = dbName ? ` (database ${dbName})` : "";

  return {
    describe: `connected directly to ${redactMongoUri(uri)}${database} (no token supplied)`,
    supportsTranslate: true,
    close: () => connection.close(),

    /** The platform's source language, created on an empty install. */
    async defaultLocale() {
      const preferred = await locales.findOne({ is_default: true });
      if (preferred) return preferred.code;
      const active = await locales.findOne(
        { is_active: true },
        { sort: { sort_order: 1, code: 1 } },
      );
      if (active) return active.code;
      await locales.insertOne(localeDocument(fallbackLocale, true));
      return fallbackLocale;
    },

    async ensureLocale(code) {
      const existing = await locales.findOne({ code });
      if (existing) return { created: false };
      await locales.insertOne(localeDocument(code, false));
      return { created: true };
    },

    /**
     * Push the code's key list and English text. Only the source locale's value
     * is written, so a language somebody translated keeps every word of it.
     */
    async syncEnglish(locale, entries) {
      const path = `values.${locale}`;
      const rows = await translations
        .find({ key: { $in: entries.map((e) => e.key) } })
        .project({ key: 1, [path]: 1 })
        .toArray();
      const current = new Map(
        rows.map((doc) => [doc.key, doc.values?.[locale] ?? ""]),
      );

      const now = new Date();
      const fresh = entries.filter((e) => !current.has(e.key));
      const drifted = entries.filter(
        (e) => current.has(e.key) && current.get(e.key) !== e.value,
      );

      if (fresh.length > 0) {
        await translations.insertMany(
          fresh.map((e) => translationDocument(e, locale, now)),
        );
      }
      if (drifted.length > 0) {
        await translations.bulkWrite(
          drifted.map((e) => ({
            updateOne: {
              filter: { key: e.key },
              update: { $set: { [path]: e.value, updated_at: now } },
            },
          })),
        );
      }
      return {
        created: fresh.length,
        updated: drifted.length,
        unchanged: entries.length - fresh.length - drifted.length,
      };
    },

    /** What one locale already has text for — blank counts as untranslated. */
    async existingValues(code) {
      const path = `values.${code}`;
      const rows = await translations
        .find({})
        .project({ key: 1, [path]: 1 })
        .toArray();
      return new Map(rows.map((doc) => [doc.key, doc.values?.[code] ?? ""]));
    },

    async writeValues(code, values) {
      if (values.size === 0) return;
      const path = `values.${code}`;
      const now = new Date();
      await translations.bulkWrite(
        [...values].map(([key, value]) => ({
          updateOne: {
            filter: { key },
            update: { $set: { [path]: value, updated_at: now } },
          },
        })),
      );
    },
  };
}

const LOCALES_QUERY = `query SyncLocales { locales { code is_default is_active } }`;
const UPSERT_LOCALE = `
  mutation SyncUpsertLocale($input: UpsertLocaleInput!) {
    upsertLocale(input: $input) { code }
  }
`;
const IMPORT_KEYS = `
  mutation SyncImportKeys($locale: String!, $entries: [TranslationValueEntry!]!) {
    importTranslationKeys(locale: $locale, entries: $entries)
  }
`;

/** Call the guarded admin API — for an environment whose database is out of reach. */
export function openGraphqlStore(url, token, fallbackLocale) {
  const call = async (query, variables) => {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ query, variables }),
    });
    if (!res.ok) throw new Error(`${url} answered ${res.status} ${res.statusText}`);
    const body = await res.json();
    if (body.errors?.length) {
      throw new Error(body.errors.map((e) => e.message).join("; "));
    }
    return body.data;
  };

  return {
    describe: `sending to ${url} with DUNCIT_ADMIN_TOKEN`,
    // importTranslationKeys writes one locale's text and only for keys it
    // creates, so per-locale translation has no transport here.
    supportsTranslate: false,
    close: async () => undefined,

    async defaultLocale() {
      const locales = (await call(LOCALES_QUERY))?.locales ?? [];
      const existing =
        locales.find((l) => l.is_default) ?? locales.find((l) => l.is_active);
      if (existing) return existing.code;
      await call(UPSERT_LOCALE, {
        input: {
          code: fallbackLocale,
          label: languageName(fallbackLocale, fallbackLocale),
          english_label: languageName(fallbackLocale, "en"),
          is_rtl: isRightToLeft(fallbackLocale),
          is_active: true,
          is_default: true,
          sort_order: 0,
        },
      });
      return fallbackLocale;
    },

    async syncEnglish(locale, entries) {
      const data = await call(IMPORT_KEYS, { locale, entries });
      const created = data?.importTranslationKeys ?? 0;
      // The mutation reports creations only; a key it left alone may still hold
      // older English, which is why this path never claims an update.
      return { created, updated: 0, unchanged: entries.length - created };
    },
  };
}
