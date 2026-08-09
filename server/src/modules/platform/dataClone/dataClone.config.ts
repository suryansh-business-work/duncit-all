/**
 * Where a production -> staging clone reads from and writes to, and the single
 * list of collections it must never copy.
 *
 * Connection strings come ONLY from the environment — nothing here is ever
 * hardcoded. Staging shares the Atlas cluster and isolates its data in its own
 * database (`duncit-staging`, CLAUDE.md rule 32), so the target URI falls back
 * to the source URI while the target DATABASE must always be set explicitly:
 * inheriting it would turn "clone into staging" into "clone production onto
 * itself", which is the one outcome this feature must make impossible.
 */
import { GraphQLError } from 'graphql';
import mongoose from 'mongoose';

export interface CloneEndpoints {
  sourceUri: string;
  sourceDb: string;
  targetUri: string;
  targetDb: string;
}

/**
 * Collections the clone NEVER copies. An excluded collection is left exactly as
 * staging already has it (the clone drops + refills only what it copies), so
 * staging keeps its own credentials, its own devices and its own logs.
 *
 * Each entry is a real MongoDB collection name (Mongoose's pluralised model
 * name), grouped by the reason it is excluded.
 */
export const EXCLUDED_COLLECTIONS: readonly string[] = [
  // --- Credentials: copying these lets staging authenticate AS production ---
  // Every managed credential set the Tech portal owns: SMTP/Resend, Razorpay,
  // ShipRocket, ImageKit, Slack, AiSensy, TURN, OpenAI/Gemini keys.
  'enventries',
  // Developer API keys (hash + prefix) that authenticate external callers.
  'apikeys',
  // The VAPID key pair. Staging must mint its own, or it can sign Web Push
  // notifications that browsers accept as production's.
  'pushkeys',
  // WhatsApp gateway session/auth state — a cloned session would send messages
  // from the production business number.
  'waconnections',
  // CRM provider credentials and webhook secrets.
  'commsproviders',

  // --- Auth material: short-lived secrets that must never be replayable ---
  // Live email/phone OTPs. A cloned, unexpired code is a working login for a
  // real person's account.
  'userverifications',

  // --- Devices: copying these makes staging spam real users ---
  // Real phones' Expo push tokens.
  'expopushtokens',
  // Real browsers' Web Push endpoints.
  'pushsubscriptions',

  // --- Outbound history: real people's contact details, and rows the portals
  //     can resend/retry from, which would reach those people from staging ---
  'emaillogs',
  'communicationlogs',

  // --- Observability: machine-generated, enormous, and meaningless once it is
  //     attributed to the wrong environment ---
  'telemetrylogs',
  'statuschecks',
  'activeuserpings',
  'appevents',
  'shortlinkclicks',

  // --- This feature's own bookkeeping. The running job document lives in the
  //     SOURCE database and is written to on every batch, so copying it would
  //     hand staging a half-written record of a clone staging never ran. ---
  'dataclonejobs',
];

const CONFIG_ERROR_CODE = 'BAD_USER_INPUT';

function configError(message: string): GraphQLError {
  return new GraphQLError(message, { extensions: { code: CONFIG_ERROR_CODE } });
}

/**
 * The cluster a URI points at — scheme, credentials and options removed — so
 * two spellings of the same cluster still compare equal.
 */
export function clusterKey(uri: string): string {
  const schemeAt = uri.indexOf('://');
  const afterScheme = schemeAt >= 0 ? uri.slice(schemeAt + 3) : uri;
  const credsAt = afterScheme.lastIndexOf('@');
  const hosts = credsAt >= 0 ? afterScheme.slice(credsAt + 1) : afterScheme;
  return hosts.split(/[/?]/)[0].toLowerCase();
}

function readEnv(key: string): string {
  return (process.env[key] ?? '').trim();
}

/**
 * The database this server is actually connected to.
 *
 * The last resort for the SOURCE name, because production's server.env
 * deliberately omits MONGO_DB_NAME (only staging sets it) and Mongo then uses
 * the URI's default database. Reading the live connection is the only way to
 * name that database without guessing it — and it is by definition the data an
 * operator means by "production". The target is never resolved this way.
 */
function connectedDbName(): string {
  return mongoose.connection.db?.databaseName ?? '';
}

/**
 * Resolve both endpoints, or throw with the exact env var that is missing.
 * Also the hard guard: a target that resolves to the source database is
 * refused outright, because that clone would overwrite production with itself.
 */
export function resolveCloneEndpoints(): CloneEndpoints {
  const sourceUri = readEnv('DATA_CLONE_SOURCE_URI') || readEnv('MONGO_URI');
  const sourceDb =
    readEnv('DATA_CLONE_SOURCE_DB') || readEnv('MONGO_DB_NAME') || connectedDbName();
  const targetUri = readEnv('DATA_CLONE_TARGET_URI') || sourceUri;
  const targetDb = readEnv('DATA_CLONE_TARGET_DB');

  if (!sourceUri) {
    throw configError('Set DATA_CLONE_SOURCE_URI (or MONGO_URI) to the production connection string.');
  }
  if (!sourceDb) {
    throw configError(
      'Set DATA_CLONE_SOURCE_DB (or MONGO_DB_NAME) — the server is not connected to a named database yet.',
    );
  }
  if (!targetDb) {
    throw configError('Set DATA_CLONE_TARGET_DB to the staging database name — it is never inherited.');
  }
  if (clusterKey(sourceUri) === clusterKey(targetUri) && sourceDb === targetDb) {
    throw configError(
      `Refusing to clone: the target resolves to the source database (${sourceDb}). ` +
        'DATA_CLONE_TARGET_DB must name a different database from the production one.',
    );
  }
  return { sourceUri, sourceDb, targetUri, targetDb };
}

export interface CloneTargets {
  sourceDatabase: string;
  targetDatabase: string;
  excluded: string[];
  ready: boolean;
  error: string | null;
}

/**
 * The same resolution as a read — so the UI can show what a clone WOULD do,
 * and why it cannot run, without starting one.
 */
export function describeCloneEndpoints(): CloneTargets {
  const excluded = [...EXCLUDED_COLLECTIONS];
  try {
    const endpoints = resolveCloneEndpoints();
    return {
      sourceDatabase: endpoints.sourceDb,
      targetDatabase: endpoints.targetDb,
      excluded,
      ready: true,
      error: null,
    };
  } catch (err) {
    return {
      sourceDatabase: '',
      targetDatabase: '',
      excluded,
      ready: false,
      error: err instanceof Error ? err.message : 'Data clone is not configured',
    };
  }
}
