import { GraphQLError } from 'graphql';
import mongoose from 'mongoose';
import { z } from 'zod';
import { envEntryService } from '@modules/platform/envEntry/envEntry.service';
import { validate } from '@utils/validate';

/**
 * A database added from Intel's Database section: MongoDB Atlas (its
 * connection string) or a self-deployed server (host, port and a user). The
 * connection is tried first; only a working one is saved — as a Tech portal
 * MONGODB entry, so the secret lives where every other credential does and
 * Intel keeps only the entry id. The password never comes back out.
 */

export const newMongoConnectionSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('ATLAS'),
    uri: z.string().trim().regex(/^mongodb(?:\+srv)?:\/\/\S{3,2000}$/, 'A connection string that starts with mongodb+srv:// or mongodb://'),
  }),
  z.object({
    type: z.literal('SELF_HOSTED'),
    host: z.string().trim().regex(/^[A-Za-z0-9.-]{1,253}$/, 'A host name or IP address, without a port'),
    port: z.number().int().min(1, 'A port from 1 to 65535').max(65535, 'A port from 1 to 65535'),
    username: z.string().trim().min(1, 'Username is required').max(100),
    password: z.string().min(1, 'Password is required').max(200),
    auth_source: z.string().trim().regex(/^[A-Za-z0-9_-]{1,64}$/, 'A database name such as admin').default('admin'),
    tls: z.boolean().default(false),
  }),
]);

export type NewMongoConnection = z.infer<typeof newMongoConnectionSchema>;

/** The connection string a self-deployed server's details make (user and password URL-encoded). */
export function mongoUriOf(conn: NewMongoConnection): string {
  if (conn.type === 'ATLAS') return conn.uri;
  const auth = `${encodeURIComponent(conn.username)}:${encodeURIComponent(conn.password)}`;
  const tls = conn.tls ? '&tls=true' : '';
  return `mongodb://${auth}@${conn.host}:${conn.port}/?authSource=${encodeURIComponent(conn.auth_source)}${tls}`;
}

const badInput = (message: string) => new GraphQLError('Validation failed', { extensions: { code: 'BAD_USER_INPUT', errors: [`config.new_connection: ${message}`] } });

/** Connect once and ping, so a typo is reported now rather than at the first sync. */
async function probe(uri: string): Promise<void> {
  const conn = mongoose.createConnection(uri, { serverSelectionTimeoutMS: 8000, connectTimeoutMS: 8000, maxPoolSize: 1, appName: 'duncit-intel-probe' });
  try {
    await conn.asPromise();
    await conn.db?.admin().ping();
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    // Driver messages can echo the connection string; never send the password back.
    throw badInput(`Could not connect: ${reason.replace(/\/\/[^@\s]*@/g, '//***@').slice(0, 300)}`);
  } finally {
    await conn.close().catch(() => undefined);
  }
}

/** Validate, try and save the connection; returns the new Tech portal entry's id. */
export async function createMongoEntry(raw: unknown, connectorName: string, database: string): Promise<string> {
  const conn = await validate(newMongoConnectionSchema, raw);
  const uri = mongoUriOf(conn);
  await probe(uri);
  const created = await envEntryService.create({
    name: `Intel · ${connectorName}`.slice(0, 120),
    category: 'MONGODB',
    description: conn.type === 'ATLAS' ? 'MongoDB Atlas, added from Duncit Intel' : `Self-deployed MongoDB at ${conn.host}, added from Duncit Intel`,
    config: { uri, database },
  });
  return String(created.id);
}
