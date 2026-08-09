#!/usr/bin/env node
/**
 * Pushes every shipped translation key to a running server, so Admin >
 * Localization > Translations is populated instead of blank (CLAUDE.md rule 38).
 *
 * The admin panel already has an "Import app keys" button that does this, but
 * it only runs when somebody opens that page and presses it — which is why a
 * freshly deployed environment shows an empty table. This is the same operation
 * as a command, so seeding can be part of setting an environment up.
 *
 * What it sends:
 *   - every key in the client fallback catalogue (packages/i18n/src/bundles/)
 *   - every key the SERVER ships copy for (its MJML email templates), read back
 *     from the `serverTranslationSeed` query so the two never drift
 *
 * Existing rows keep their translations — the server only inserts keys it does
 * not already have — so this is safe to re-run at any time. That is what makes
 * it a sync rather than an overwrite.
 *
 * Usage:
 *   DUNCIT_ADMIN_TOKEN=<token> npm run seed:localization
 *   DUNCIT_ADMIN_TOKEN=<token> DUNCIT_GRAPHQL_URL=https://staging.server.duncit.com/graphql \
 *     npm run seed:localization
 *
 * The token must belong to a user with admin write access; it is read from the
 * environment and never written to disk or committed.
 */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { catalogueEntries } from "./lib/bundle-catalogue.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const GRAPHQL_URL =
  process.env.DUNCIT_GRAPHQL_URL ?? "http://localhost:2001/graphql";
const TOKEN = process.env.DUNCIT_ADMIN_TOKEN ?? "";
/** The locale the bundled English text is stored against when none is default. */
const FALLBACK_LOCALE = process.env.DUNCIT_SEED_LOCALE ?? "en";

async function graphql(query, variables) {
  const res = await fetch(GRAPHQL_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok)
    throw new Error(`${GRAPHQL_URL} answered ${res.status} ${res.statusText}`);
  const body = await res.json();
  if (body.errors?.length)
    throw new Error(body.errors.map((e) => e.message).join("; "));
  return body.data;
}

const LOCALES_QUERY = `query SeedLocales { locales { code label is_default is_active } }`;
const SERVER_SEED_QUERY = `query SeedServerKeys { serverTranslationSeed { key value } }`;
const UPSERT_LOCALE = `
  mutation SeedUpsertLocale($input: UpsertLocaleInput!) {
    upsertLocale(input: $input) { code }
  }
`;
const IMPORT_KEYS = `
  mutation SeedImportKeys($locale: String!, $entries: [TranslationValueEntry!]!) {
    importTranslationKeys(locale: $locale, entries: $entries)
  }
`;

/**
 * The locale the English text belongs to. Uses the configured default when one
 * exists; otherwise creates it, because `importTranslationKeys` stores values
 * against a locale and has nowhere to put them on an empty install — which is
 * exactly the state that leaves the admin table blank.
 */
async function resolveDefaultLocale() {
  const data = await graphql(LOCALES_QUERY);
  const locales = data?.locales ?? [];
  const existing =
    locales.find((l) => l.is_default) ?? locales.find((l) => l.is_active);
  if (existing) return existing.code;

  console.log(
    `No locale configured — creating "${FALLBACK_LOCALE}" as the default.`,
  );
  await graphql(UPSERT_LOCALE, {
    input: {
      code: FALLBACK_LOCALE,
      label: "English",
      english_label: "English",
      is_rtl: false,
      is_active: true,
      is_default: true,
      sort_order: 0,
    },
  });
  return FALLBACK_LOCALE;
}

if (!TOKEN) {
  console.error(
    "seed-localization: DUNCIT_ADMIN_TOKEN is required (an admin user's bearer token).\n" +
      "  Seeding writes to Localization, which the server guards with ADMIN_WRITE.",
  );
  process.exit(1);
}

console.log(`seed-localization: target ${GRAPHQL_URL}`);

try {
  const clientEntries = catalogueEntries(ROOT);
  const locale = await resolveDefaultLocale();

  // The server's own email copy is fetched rather than duplicated here, so the
  // script cannot fall behind a template that added a key.
  const serverSeed =
    (await graphql(SERVER_SEED_QUERY))?.serverTranslationSeed ?? [];

  const merged = new Map();
  for (const entry of clientEntries) merged.set(entry.key, entry.value);
  for (const entry of serverSeed) merged.set(entry.key, entry.value);

  const entries = [...merged].map(([key, value]) => ({ key, value }));
  const added = await graphql(IMPORT_KEYS, { locale, entries });

  console.log(
    `seed-localization: ${clientEntries.length} client + ${serverSeed.length} server key(s) ` +
      `= ${entries.length} unique, sent against "${locale}".`,
  );
  console.log(
    added?.importTranslationKeys > 0
      ? `seed-localization: ${added.importTranslationKeys} new key(s) created; existing translations untouched.`
      : "seed-localization: already up to date — nothing new to create.",
  );
} catch (error) {
  // A stack trace here is noise: every realistic failure is operational (server
  // down, wrong URL, token lacking ADMIN_WRITE), and the message says which.
  console.error(`seed-localization: ${error.message}`);
  process.exit(1);
}
