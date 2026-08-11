import dns from 'node:dns/promises';
import mongoose from 'mongoose';

/**
 * Connecting a migration to the right database, with the same rules everywhere.
 *
 * Shared by the migrations that delete or rewrite data: they all need the same
 * `--uri` override, the same refusal to write to a remote cluster by accident,
 * and the same readable failure when nothing is listening. Duplicating that per
 * script is how one of them ends up without the guard.
 */
export interface MigrationTarget {
  /** True when `--dry-run` was passed: read-only, so the remote guard relaxes. */
  dry: boolean;
}

/** Is this connection string pointing at a database on this machine? */
export function isLocalUri(uri: string): boolean {
  return /^mongodb:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])[:/]/i.test(uri.trim());
}

/** The `--uri <value>` override, if present. */
export function uriOverride(argv: readonly string[]): string | undefined {
  const at = argv.indexOf('--uri');
  return at === -1 ? undefined : argv[at + 1];
}

/**
 * Resolve the target, enforce the write guard, connect, and say out loud which
 * database was reached. Exits the process with a readable message rather than a
 * stack trace on every failure a person can actually cause.
 */
export async function connectForMigration({ dry }: MigrationTarget): Promise<mongoose.Connection> {
  const uri = uriOverride(process.argv) ?? process.env.MONGO_URI;
  if (!uri) {
    console.error('No database. Set MONGO_URI in server/.env, or pass --uri <connection-string>.');
    process.exit(1);
  }

  // A WRITE against a remote cluster needs saying out loud. These migrations
  // cannot be undone by redeploying, and the checked-in .env points at the
  // hosted cluster — so the easiest possible mistake is running the real thing
  // while meaning to rehearse.
  if (!dry && !isLocalUri(uri) && !process.argv.includes('--i-know-this-is-production')) {
    console.error(
      'Refusing to write to a non-local database.\n' +
        'Rehearse on a local restore first (the :local scripts), then re-run with\n' +
        '--i-know-this-is-production when production is genuinely the target.'
    );
    process.exit(1);
  }

  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
  } catch (error) {
    // A blocked SRV lookup is not an unreachable cluster — it is a resolver
    // that will not answer this record type. Try again over public DNS before
    // telling anyone their database is unreachable.
    const resolved = await srvFallbackUri(uri, error);
    if (!resolved) {
      console.error(explainConnectionFailure(uri, error));
      process.exit(1);
    }
    console.log('SRV lookup was refused locally — resolved the cluster over public DNS.');
    try {
      await mongoose.connect(resolved, { serverSelectionTimeoutMS: 8000 });
    } catch (retryError) {
      console.error(explainConnectionFailure(uri, retryError));
      process.exit(1);
    }
  }

  console.log(`Connected to ${mongoose.connection.name} (${dry ? 'DRY RUN' : 'WRITING'})\n`);
  return mongoose.connection;
}

/**
 * Public resolvers to fall back to, in order: Cloudflare, then Google.
 *
 * Hardcoded deliberately (Sonar S1313): the whole point is to bypass whatever
 * the machine's own resolver is, so taking these from the environment that is
 * already failing would defeat it. They are queried for one SRV and one TXT
 * record on a public hostname — no credentials leave the process.
 */
const PUBLIC_DNS = ['1.1.1.1', '8.8.8.8'];

const messageOf = (error: unknown): string =>
  error instanceof Error ? error.message : JSON.stringify(error);

/** Does this failure look like "the resolver would not answer", rather than
 * "the database said no"? */
const isSrvLookupFailure = (error: unknown): boolean =>
  /querySrv|queryTxt|ENOTFOUND|EAI_AGAIN|ECONNREFUSED/i.test(messageOf(error));

/**
 * Turn a `mongodb+srv://` URI into the plain `mongodb://` one it stands for,
 * resolving the SRV and TXT records over public DNS.
 *
 * `mongodb+srv` is only sugar: the driver looks up `_mongodb._tcp.<host>` for
 * the seed list and a TXT record on `<host>` for default options, then connects
 * normally. When the local resolver refuses those queries — corporate DNS and
 * sandboxes commonly do — the cluster is perfectly reachable and the driver
 * still cannot start. This does the same two lookups against a resolver that
 * answers, and hands back an equivalent URI.
 *
 * Returns null when the failure was not a lookup problem, or when the records
 * cannot be read even over public DNS — in which case the caller reports the
 * original error rather than a misleading one about DNS.
 */
async function srvFallbackUri(uri: string, error: unknown): Promise<string | null> {
  if (!uri.startsWith('mongodb+srv://') || !isSrvLookupFailure(error)) return null;

  let parsed: URL;
  try {
    // The URL parser accepts the scheme; credentials and path come out intact.
    parsed = new URL(uri);
  } catch {
    return null;
  }
  const host = parsed.hostname;

  for (const server of PUBLIC_DNS) {
    try {
      const resolver = new dns.Resolver();
      resolver.setServers([server]);
      const [records, txt] = await Promise.all([
        resolver.resolveSrv(`_mongodb._tcp.${host}`),
        resolver.resolveTxt(host).catch(() => [] as string[][]),
      ]);
      if (records.length === 0) continue;

      const seeds = records.map((r) => `${r.name}:${r.port}`).join(',');
      // The TXT record carries cluster defaults (authSource, replicaSet). Its
      // options come FIRST so anything explicit on the original URI wins.
      const fromTxt = txt.flat().join('&');
      const own = parsed.search.replace(/^\?/, '');
      const options = ['tls=true', fromTxt, own].filter(Boolean).join('&');
      const secret = parsed.password ? `:${parsed.password}` : '';
      const auth = parsed.username ? `${parsed.username}${secret}@` : '';
      return `mongodb://${auth}${seeds}${parsed.pathname}?${options}`;
    } catch {
      // Try the next resolver.
    }
  }
  return null;
}

/** Turn a driver error into something that says what to do about it. */
function explainConnectionFailure(uri: string, error: unknown): string {
  const message = messageOf(error);
  const local = isLocalUri(uri);
  if (local && /ECONNREFUSED/i.test(message)) {
    return (
      `No MongoDB is listening at ${uri}\n\n` +
      'Start one, or point the script somewhere else:\n' +
      '  docker run -d -p 27017:27017 --name duncit-local mongo:7\n' +
      '  npm run migrate:drop-user-copies:local:dry\n' +
      'or run it against any database you can reach:\n' +
      '  npm run migrate:drop-user-copies:dry -- --uri <connection-string>'
    );
  }
  if (/querySrv|ENOTFOUND|EAI_AGAIN/i.test(message)) {
    return (
      `Could not resolve the database host.\n  ${message}\n\n` +
      'A mongodb+srv:// URI needs DNS SRV lookups, which some networks and\n' +
      'sandboxes block. Try the non-SRV (mongodb://) form of the same cluster,\n' +
      'or run this from a machine that can reach it.'
    );
  }
  return `Could not connect to the database.\n  ${message}`;
}
