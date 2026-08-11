/**
 * Where a production -> staging clone reads from and writes to, and the single
 * list of collections it must never copy.
 *
 * Both endpoints come from the two connections an operator saves and PROVES in
 * Data Clone -> Settings (see ./dataCloneConnection.model) — nothing here is
 * ever hardcoded, and an unverified connection is treated exactly like a
 * missing one. Staging shares the Atlas cluster and isolates its data in its
 * own database (`duncit-staging`, CLAUDE.md rule 32), so the guard that matters
 * is not the URI but the pair: a target resolving to the source cluster AND
 * database would turn "clone into staging" into "clone production onto itself",
 * which is the one outcome this feature must make impossible.
 */
import { GraphQLError } from 'graphql';
import {
  DataCloneConnectionModel,
  type DataCloneConnectionDoc,
  type DataCloneRole,
} from './dataCloneConnection.model';

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
  // The saved production + staging connection strings. Copying them would both
  // hand staging production's credentials and overwrite the settings of the
  // server running the clone, mid-clone.
  'datacloneconnections',
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

/** The saved connection for one end, or null when it was never saved. */
export function findConnection(role: DataCloneRole): Promise<DataCloneConnectionDoc | null> {
  return DataCloneConnectionModel.findOne({ role }).lean<DataCloneConnectionDoc>().exec();
}

/**
 * The write end, pinned by the environment.
 *
 * Both deployed stacks set DATA_CLONE_TARGET_DB=duncit-staging, and the deploy
 * relies on that pin — not on which portal a clone is started from — to keep
 * production read-only. Endpoints being operator-chosen must not quietly hand
 * that back: on a stack that pins a target, the staging connection may only
 * name that database. A server that pins nothing (local development) lets the
 * operator name any target, which is the whole point of the settings dialog.
 *
 * Returns the reason it is refused, or null when the target is allowed.
 */
export function targetPinViolation(database: string): string | null {
  const pinned = (process.env.DATA_CLONE_TARGET_DB ?? '').trim();
  if (!pinned || pinned === database) return null;
  return `This server only allows a clone to write to ${pinned} (pinned by DATA_CLONE_TARGET_DB), not ${database}.`;
}

/**
 * Whether one end is usable, in the order an operator fixes it: paste the
 * string, name the database, then press Connect. A saved-but-unproved
 * connection is refused, because the only thing that proves a connection
 * string works is having used it.
 */
function assertUsable(doc: DataCloneConnectionDoc | null, label: string): DataCloneConnectionDoc {
  if (!doc?.uri || !doc.database) {
    throw configError(`Add the ${label} connection in Data Clone -> Settings.`);
  }
  if (!doc.connected) {
    throw configError(
      `The ${label} connection has not been verified — open Data Clone -> Settings and press Connect.`,
    );
  }
  return doc;
}

/**
 * Resolve both endpoints, or throw with the exact thing an operator must fix.
 * Also the hard guard: a target that resolves to the source database is
 * refused outright, because that clone would overwrite production with itself.
 */
export async function resolveCloneEndpoints(): Promise<CloneEndpoints> {
  const [productionDoc, stagingDoc] = await Promise.all([
    findConnection('PRODUCTION'),
    findConnection('STAGING'),
  ]);
  const production = assertUsable(productionDoc, 'production');
  const staging = assertUsable(stagingDoc, 'staging');

  const pinViolation = targetPinViolation(staging.database);
  if (pinViolation) throw configError(pinViolation);

  if (
    clusterKey(production.uri) === clusterKey(staging.uri) &&
    production.database === staging.database
  ) {
    throw configError(
      `Refusing to clone: staging resolves to the same cluster and database as production (${production.database}). ` +
        'The staging connection must name a different database.',
    );
  }
  return {
    sourceUri: production.uri,
    sourceDb: production.database,
    targetUri: staging.uri,
    targetDb: staging.database,
  };
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
export async function describeCloneEndpoints(): Promise<CloneTargets> {
  const excluded = [...EXCLUDED_COLLECTIONS];
  try {
    const endpoints = await resolveCloneEndpoints();
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
