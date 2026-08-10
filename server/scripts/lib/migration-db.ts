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
    console.error(explainConnectionFailure(uri, error));
    process.exit(1);
  }

  console.log(`Connected to ${mongoose.connection.name} (${dry ? 'DRY RUN' : 'WRITING'})\n`);
  return mongoose.connection;
}

/** Turn a driver error into something that says what to do about it. */
function explainConnectionFailure(uri: string, error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
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
