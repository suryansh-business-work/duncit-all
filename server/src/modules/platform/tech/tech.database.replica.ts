/**
 * Tech > Database > Info: the replica set behind the connection, and its oplog.
 *
 * Both need the clusterMonitor role (replSetGetStatus on the cluster, read on
 * `local`), which the app's own user is not given by default — so each answers
 * null with the server's refusal as the reason, and the page says which grant
 * fills it in. Read-only throughout: nothing here can step a member down,
 * reconfigure the set or start a resync.
 */
import { mongo } from 'mongoose';
import { scrubUri } from '../dataClone/dataCloneConnection.service';

export interface ReplicaMember {
  name: string;
  stateStr: string;
  healthy: boolean;
  self: boolean;
  uptimeSeconds: number;
  optimeAt: string | null;
  /** Seconds behind the primary's last applied write; null for the primary itself. */
  lagSeconds: number | null;
  lastHeartbeatAt: string | null;
  pingMs: number | null;
  syncSourceHost: string | null;
  priority: number | null;
  votes: number | null;
}

const iso = (value: unknown): string | null => (value instanceof Date ? value.toISOString() : null);
const dateOf = (value: unknown): Date | null => (value instanceof Date ? value : null);

function lagOf(primaryOptime: Date | null, optime: Date | null): number | null {
  if (!primaryOptime || !optime) return null;
  return Math.max(0, Math.round((primaryOptime.getTime() - optime.getTime()) / 1000));
}

function memberOf(m: mongo.Document, primaryOptime: Date | null, cfg: mongo.Document | undefined): ReplicaMember {
  const optime = dateOf(m.optimeDate);
  return {
    name: m.name,
    stateStr: m.stateStr,
    healthy: m.health === 1,
    self: Boolean(m.self),
    uptimeSeconds: m.uptime ?? 0,
    optimeAt: iso(optime),
    lagSeconds: m.stateStr === 'PRIMARY' ? null : lagOf(primaryOptime, optime),
    lastHeartbeatAt: iso(m.lastHeartbeatRecv),
    pingMs: m.pingMs ?? null,
    syncSourceHost: m.syncSourceHost || null,
    priority: cfg?.priority ?? null,
    votes: cfg?.votes ?? null,
  };
}

/** Members, their state and lag, joined with each one's priority/votes from the config. */
export async function replicaOf(db: mongo.Db, uri: string) {
  try {
    const admin = db.admin();
    const [status, config] = await Promise.all([
      admin.replSetGetStatus(),
      admin.command({ replSetGetConfig: 1 }),
    ]);
    const members: mongo.Document[] = status.members ?? [];
    const primary = members.find((m) => m.stateStr === 'PRIMARY');
    const primaryOptime = dateOf(primary?.optimeDate);
    const cfgMembers: mongo.Document[] = config.config?.members ?? [];
    const me = members.find((m) => m.self);
    return {
      replica: {
        set: status.set,
        term: status.term ?? null,
        myState: me?.stateStr ?? null,
        primary: primary?.name ?? null,
        heartbeatIntervalMs: status.heartbeatIntervalMillis ?? null,
        configVersion: config.config?.version ?? null,
        members: members.map((m) =>
          memberOf(
            m,
            primaryOptime,
            cfgMembers.find((c) => c.host === m.name),
          ),
        ),
      },
      replicaError: null,
    };
  } catch (err) {
    return { replica: null, replicaError: scrubUri((err as Error).message, uri) };
  }
}

/** How much replication history the set keeps, and how far back it reaches. */
export async function oplogOf(client: mongo.MongoClient, uri: string) {
  try {
    const oplog = client.db('local').collection('oplog.rs');
    const [stats, first, last] = await Promise.all([
      oplog.aggregate([{ $collStats: { storageStats: {} } }]).next(),
      oplog.find({}, { projection: { wall: 1 } }).sort({ $natural: 1 }).limit(1).next(),
      oplog.find({}, { projection: { wall: 1 } }).sort({ $natural: -1 }).limit(1).next(),
    ]);
    const s: mongo.Document = stats?.storageStats ?? {};
    const firstAt = dateOf(first?.wall);
    const lastAt = dateOf(last?.wall);
    const windowSeconds = firstAt && lastAt ? Math.round((lastAt.getTime() - firstAt.getTime()) / 1000) : null;
    return {
      oplog: {
        entries: s.count ?? 0,
        dataBytes: s.size ?? 0,
        maxBytes: s.maxSize ?? null,
        firstAt: iso(firstAt),
        lastAt: iso(lastAt),
        windowSeconds,
      },
      oplogError: null,
    };
  } catch (err) {
    return { oplog: null, oplogError: scrubUri((err as Error).message, uri) };
  }
}
