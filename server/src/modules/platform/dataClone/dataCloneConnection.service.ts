/**
 * Saving and PROVING the two database connections a clone runs between.
 *
 * A connection is only ever "connected" because the server reached the cluster
 * and listed the database with the exact string that was saved — never because
 * someone typed something that looked right. Every save therefore re-probes,
 * and a failed probe leaves the values saved (so they can be corrected) with
 * `connected` false and the driver's own message on the document.
 *
 * The saved URI is never returned to a client: reads get a masked spelling that
 * is enough to recognise a cluster and never enough to connect to one.
 */
import { GraphQLError } from 'graphql';
import mongoose, { mongo } from 'mongoose';
import { logs } from '@observability/log';
import { clusterKey, findConnection, targetPinViolation } from './dataClone.config';
import {
  DataCloneConnectionModel,
  type DataCloneConnectionDoc,
  type DataCloneRole,
} from './dataCloneConnection.model';

/** A wrong or unreachable host must fail the request, not hold it open. */
const PROBE_TIMEOUT_MS = 10_000;
const URI_SCHEMES = ['mongodb://', 'mongodb+srv://'] as const;

function badInput(message: string): GraphQLError {
  return new GraphQLError(message, { extensions: { code: 'BAD_USER_INPUT' } });
}

export interface PublicCloneConnection {
  role: DataCloneRole;
  uriMasked: string;
  hasUri: boolean;
  database: string;
  connected: boolean;
  collectionCount: number;
  lastTestedAt: string | null;
  lastTestError: string | null;
}

export interface PublicCloneSettings {
  production: PublicCloneConnection;
  staging: PublicCloneConnection;
}

/**
 * `mongodb+srv://user:••••@cluster0.abc.mongodb.net` — the cluster an operator
 * needs to recognise which account is saved, with the password removed.
 */
export function maskUri(uri: string): string {
  if (!uri) return '';
  const schemeAt = uri.indexOf('://');
  if (schemeAt < 0) return '••••';
  const scheme = uri.slice(0, schemeAt + 3);
  const rest = uri.slice(schemeAt + 3);
  const credsAt = rest.lastIndexOf('@');
  const host = (credsAt >= 0 ? rest.slice(credsAt + 1) : rest).split(/[/?]/)[0];
  if (credsAt < 0) return scheme + host;
  const user = rest.slice(0, credsAt).split(':')[0];
  return `${scheme}${user}:••••@${host}`;
}

function toPublic(role: DataCloneRole, doc: DataCloneConnectionDoc | null): PublicCloneConnection {
  return {
    role,
    uriMasked: maskUri(doc?.uri ?? ''),
    hasUri: !!doc?.uri,
    database: doc?.database ?? '',
    connected: !!doc?.connected,
    collectionCount: doc?.collection_count ?? 0,
    lastTestedAt: doc?.last_tested_at ? new Date(doc.last_tested_at).toISOString() : null,
    lastTestError: doc?.last_test_error ?? null,
  };
}

function readEnv(key: string): string {
  return (process.env[key] ?? '').trim();
}

/**
 * The database this server is actually connected to — the last resort for the
 * production seed, because production's server.env deliberately omits
 * MONGO_DB_NAME (only staging sets it) and Mongo then uses the URI's default.
 */
function connectedDbName(): string {
  return mongoose.connection.db?.databaseName ?? '';
}

/**
 * What a never-configured role starts life as, taken from the DATA_CLONE_* env
 * vars this feature used to read exclusively. It is a SEED, not a fallback: it
 * is written once, on first read, and an operator edits it from then on — so an
 * already-deployed stack opens the dialog pre-filled instead of blank, and
 * still has to press Connect before anything can run.
 */
function envSeed(role: DataCloneRole): { uri: string; database: string } {
  const sourceUri = readEnv('DATA_CLONE_SOURCE_URI') || readEnv('MONGO_URI');
  if (role === 'PRODUCTION') {
    return {
      uri: sourceUri,
      database:
        readEnv('DATA_CLONE_SOURCE_DB') || readEnv('MONGO_DB_NAME') || connectedDbName(),
    };
  }
  return {
    uri: readEnv('DATA_CLONE_TARGET_URI') || sourceUri,
    database: readEnv('DATA_CLONE_TARGET_DB'),
  };
}

/**
 * The saved document, creating it from the env seed the first time. `connected`
 * is deliberately absent from the seed: a seeded connection is unproved.
 */
async function getOrSeed(role: DataCloneRole): Promise<DataCloneConnectionDoc> {
  const existing = await findConnection(role);
  if (existing) return existing;
  const seed = envSeed(role);
  await DataCloneConnectionModel.updateOne(
    { role },
    { $setOnInsert: { role, uri: seed.uri, database: seed.database, connected: false } },
    { upsert: true },
  ).exec();
  const created = await findConnection(role);
  if (!created) throw badInput('The connection could not be created.');
  return created;
}

/** The password in a connection string, or '' when it carries none. */
function passwordOf(uri: string): string {
  const schemeAt = uri.indexOf('://');
  if (schemeAt < 0) return '';
  const rest = uri.slice(schemeAt + 3);
  const credsAt = rest.lastIndexOf('@');
  if (credsAt < 0) return '';
  const colonAt = rest.slice(0, credsAt).indexOf(':');
  return colonAt < 0 ? '' : rest.slice(colonAt + 1, credsAt);
}

/**
 * Some driver errors quote the connection string they were given, and this
 * message is both stored and rendered — which would undo the whole point of
 * never returning the URI. Both the string and its password are replaced by
 * the same masked spelling a read gets.
 */
function scrubUri(message: string, uri: string): string {
  const withoutUri = message.replaceAll(uri, maskUri(uri));
  const password = passwordOf(uri);
  return password ? withoutUri.replaceAll(password, '••••') : withoutUri;
}

/**
 * Open the saved string, prove the database is readable, and count it.
 *
 * The client is constructed INSIDE the try because the driver parses the URI in
 * its constructor and throws synchronously for strings that pass the scheme
 * check — a port on a +srv URI, an unescaped character in the password, a
 * truncated paste. Built outside, those escaped as an unscrubbed GraphQL error
 * (and some of them quote the password verbatim) and skipped the write that
 * records the failure, leaving the new string paired with the previous probe's
 * timestamp and count.
 */
async function probe(
  uri: string,
  database: string,
): Promise<{ ok: boolean; count: number; error: string | null }> {
  let client: mongo.MongoClient | undefined;
  try {
    client = new mongo.MongoClient(uri, {
      serverSelectionTimeoutMS: PROBE_TIMEOUT_MS,
      connectTimeoutMS: PROBE_TIMEOUT_MS,
    });
    await client.connect();
    const db = client.db(database);
    await db.command({ ping: 1 });
    const names = await db.listCollections({}, { nameOnly: true }).toArray();
    return { ok: true, count: names.length, error: null };
  } catch (err) {
    const raw = err instanceof Error ? err.message : 'Connection failed';
    const message = scrubUri(raw, uri);
    logs.server.warn('dataCloneConnection', 'probe', { message, database });
    return { ok: false, count: 0, error: message };
  } finally {
    await Promise.allSettled([client?.close()]);
  }
}

const OTHER_ROLE: Record<DataCloneRole, DataCloneRole> = {
  PRODUCTION: 'STAGING',
  STAGING: 'PRODUCTION',
};

/**
 * The same guards `resolveCloneEndpoints` enforces, applied at connect time so
 * an operator learns about them while looking at the field that caused them —
 * not from a disabled button on the page behind the dialog.
 */
async function connectRefusal(
  role: DataCloneRole,
  doc: DataCloneConnectionDoc,
): Promise<string | null> {
  // A stack that pins its write target refuses any other one, and refuses it
  // here so the operator reads it under the field that caused it.
  if (role === 'STAGING') {
    const pinViolation = targetPinViolation(doc.database);
    if (pinViolation) return pinViolation;
  }
  const other = await findConnection(OTHER_ROLE[role]);
  if (!other?.uri) return null;
  if (clusterKey(other.uri) !== clusterKey(doc.uri) || other.database !== doc.database) return null;
  return `This is the same cluster and database as the ${OTHER_ROLE[role].toLowerCase()} connection (${doc.database}). A clone would overwrite it with itself.`;
}

/**
 * Scoped to the exact values that were proved, not just the role: a probe takes
 * up to ten seconds, and a verdict that lands after the string it tested was
 * replaced must be a no-op rather than stamp `connected` onto a string nobody
 * has ever connected with.
 */
async function writeProbeResult(
  doc: DataCloneConnectionDoc,
  result: { ok: boolean; count: number; error: string | null },
): Promise<void> {
  await DataCloneConnectionModel.updateOne(
    { role: doc.role, uri: doc.uri, database: doc.database },
    {
      $set: {
        connected: result.ok,
        collection_count: result.count,
        last_tested_at: new Date(),
        last_test_error: result.error,
      },
    },
  ).exec();
}

export interface SaveConnectionInput {
  uri?: string | null;
  database: string;
}

/** Both ends, seeding either from the environment the first time it is read. */
async function readSettings(): Promise<PublicCloneSettings> {
  const [production, staging] = await Promise.all([getOrSeed('PRODUCTION'), getOrSeed('STAGING')]);
  return { production: toPublic('PRODUCTION', production), staging: toPublic('STAGING', staging) };
}

/**
 * Re-prove what is already saved. Reachability is not a property of the string —
 * a rotated password or a paused cluster changes the answer without anything
 * here changing — so this stays available after a save succeeds.
 */
async function proveConnection(role: DataCloneRole): Promise<PublicCloneSettings> {
  const doc = await getOrSeed(role);
  if (!doc.uri || !doc.database) {
    throw badInput('Add the connection string and database name first.');
  }
  const refusal = await connectRefusal(role, doc);
  const result = refusal
    ? { ok: false, count: 0, error: refusal }
    : await probe(doc.uri, doc.database);
  await writeProbeResult(doc, result);
  return readSettings();
}

/**
 * Save one end and immediately prove it. A blank URI keeps the stored one, so
 * the database name can be corrected without re-pasting credentials that are
 * only ever shown masked.
 */
async function saveConnection(
  role: DataCloneRole,
  input: SaveConnectionInput,
): Promise<PublicCloneSettings> {
  const existing = await getOrSeed(role);
  const uri = (input.uri ?? '').trim() || existing.uri;
  const database = input.database.trim();
  if (!uri) {
    throw badInput('Paste the connection string for this database.');
  }
  if (!URI_SCHEMES.some((scheme) => uri.startsWith(scheme))) {
    throw badInput('A MongoDB connection string starts with mongodb:// or mongodb+srv://.');
  }
  if (!database) {
    throw badInput('Name the database this connection points at.');
  }
  // `connected` is cleared in the same write that changes the values, so there
  // is no instant where a stale true describes a string nobody has used.
  await DataCloneConnectionModel.updateOne(
    { role },
    { $set: { uri, database, connected: false, last_test_error: null } },
    { upsert: true },
  ).exec();
  return proveConnection(role);
}

export const dataCloneConnectionService = {
  settings: readSettings,
  save: saveConnection,
  test: proveConnection,
};
