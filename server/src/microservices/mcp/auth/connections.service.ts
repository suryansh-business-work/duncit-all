import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import type { AuthUser } from '@context';
import { identityForToken } from '@modules/access/auth/token-identity';
import { hasPortalAccess } from '@modules/portals/portal.gate';
import { logs } from '@observability/log';
import { runTableQuery, type TableEntityConfig, type TableQueryInput } from '@utils/table-query';
import { isMcpManager } from '../mcp.access';
import { LAST_USED_WRITE_INTERVAL_MS, MCP_PORTAL_KEY } from '../mcp.constants';
import { McpConnectionModel, type IMcpConnection } from './oauth.models';
import { issueTokenPair, sha256, type TokenPair } from './tokens';

/**
 * Connections: one per approval on the consent page, holding the current
 * access/refresh pair as hashes. Everything that decides whether a token still
 * works lives here, so the OAuth provider, the MCP endpoints and the console
 * all ask the same question the same way.
 *
 * A token stops working the moment any of these is true: it expired, the
 * connection was revoked, the account was locked or deleted, the password was
 * reset after the connection was approved, or the person no longer holds an
 * MCP role. Roles are read fresh on every call.
 */

export interface ConnectionMeta {
  ip?: string | null;
  userAgent?: string | null;
}

export interface VerifiedConnection {
  id: string;
  clientId: string;
  clientName: string;
  scopes: string[];
  resource: string;
  /** Seconds since the epoch. */
  expiresAt: number;
  user: AuthUser;
}

export class ConnectionRefusedError extends Error {}

const CONNECTION_TABLE: TableEntityConfig = {
  searchFields: ['client_name', 'user_email', 'last_ip'],
  sortFields: {
    client_name: 'client_name',
    user_email: 'user_email',
    created_at: 'created_at',
    last_used_at: 'last_used_at',
    revoked_at: 'revoked_at',
  },
  filterFields: {
    client_name: { type: 'string' },
    user_email: { type: 'string' },
    created_at: { type: 'date' },
    last_used_at: { type: 'date' },
    revoked_at: { type: 'date' },
  },
  defaultSort: { created_at: -1 },
};

const iso = (date: Date | null | undefined): string | null => (date ? date.toISOString() : null);

function statusOf(doc: IMcpConnection, now = Date.now()): 'ACTIVE' | 'REVOKED' | 'EXPIRED' {
  if (doc.revoked_at) return 'REVOKED';
  return doc.refresh_expires_at.getTime() <= now ? 'EXPIRED' : 'ACTIVE';
}

export function toConnectionPub(doc: IMcpConnection) {
  return {
    id: String(doc._id),
    user_id: String(doc.user_id),
    user_email: doc.user_email,
    client_id: doc.client_id,
    client_name: doc.client_name,
    scopes: [...doc.scopes],
    resource: doc.resource,
    status: statusOf(doc),
    created_at: doc.created_at.toISOString(),
    last_used_at: iso(doc.last_used_at),
    last_ip: doc.last_ip,
    user_agent: doc.user_agent,
    revoked_at: iso(doc.revoked_at),
    revoked_reason: doc.revoked_reason,
  };
}

/** The account, if it may still use MCP at all. */
async function allowedUser(userId: string, issuedAt: number): Promise<AuthUser | null> {
  const user = await identityForToken(userId, issuedAt);
  return user && hasPortalAccess(MCP_PORTAL_KEY, user.roles) ? user : null;
}

export const mcpConnectionService = {
  async create(input: {
    user: AuthUser;
    clientId: string;
    clientName: string;
    scopes: string[];
    resource: string;
    meta?: ConnectionMeta;
  }): Promise<{ id: string; pair: TokenPair }> {
    const pair = issueTokenPair();
    const doc = await McpConnectionModel.create({
      user_id: new Types.ObjectId(input.user.id),
      user_email: input.user.email ?? null,
      client_id: input.clientId,
      client_name: input.clientName,
      scopes: input.scopes,
      resource: input.resource,
      issued_at: Math.floor(Date.now() / 1000),
      last_ip: input.meta?.ip ?? null,
      user_agent: input.meta?.userAgent ?? null,
      ...pair.stored,
    });
    logs.server.info('mcp', 'connectionCreated', {
      connectionId: String(doc._id),
      userId: input.user.id,
      clientName: input.clientName,
      scopes: input.scopes,
    });
    return { id: String(doc._id), pair };
  },

  /**
   * Swap a refresh token for a new pair. A refresh token that was already
   * swapped once is a stolen copy being replayed (or a client bug that looks
   * exactly like one) — the whole connection ends.
   */
  async rotate(refreshToken: string, clientId: string): Promise<{ pair: TokenPair; scopes: string[] }> {
    const hash = sha256(refreshToken);
    const doc = await McpConnectionModel.findOne({ refresh_hash: hash });
    if (!doc) {
      const replayed = await McpConnectionModel.findOne({ previous_refresh_hash: hash, revoked_at: null });
      if (replayed) await this.revokeDoc(replayed, 'refresh token replayed');
      throw new ConnectionRefusedError('Unknown refresh token');
    }
    if (doc.client_id !== clientId) throw new ConnectionRefusedError('Refresh token was issued to another client');
    if (statusOf(doc) !== 'ACTIVE') throw new ConnectionRefusedError('This connection has ended — connect again');
    if (!(await allowedUser(String(doc.user_id), doc.issued_at))) {
      throw new ConnectionRefusedError('This account can no longer use MCP');
    }
    const pair = issueTokenPair();
    const swapped = await McpConnectionModel.findOneAndUpdate(
      { _id: doc._id, refresh_hash: hash, revoked_at: null },
      { $set: { ...pair.stored, previous_refresh_hash: hash } },
      { new: true }
    );
    // Lost a race with a parallel refresh of the same token: only one may win.
    if (!swapped) throw new ConnectionRefusedError('Refresh token already used');
    return { pair, scopes: [...doc.scopes] };
  },

  async verify(accessToken: string, meta: ConnectionMeta = {}): Promise<VerifiedConnection | null> {
    const doc = await McpConnectionModel.findOne({ access_hash: sha256(accessToken), revoked_at: null });
    if (!doc || doc.access_expires_at.getTime() <= Date.now()) return null;
    const user = await allowedUser(String(doc.user_id), doc.issued_at);
    if (!user) return null;
    if (!doc.last_used_at || Date.now() - doc.last_used_at.getTime() > LAST_USED_WRITE_INTERVAL_MS) {
      McpConnectionModel.updateOne(
        { _id: doc._id },
        { $set: { last_used_at: new Date(), last_ip: meta.ip ?? doc.last_ip, user_agent: meta.userAgent ?? doc.user_agent } }
      )
        .exec()
        .catch((error: unknown) => logs.server.error('mcp', 'connectionTouch', { error }));
    }
    return {
      id: String(doc._id),
      clientId: doc.client_id,
      clientName: doc.client_name,
      scopes: [...doc.scopes],
      resource: doc.resource,
      expiresAt: Math.floor(doc.access_expires_at.getTime() / 1000),
      user,
    };
  },

  /** RFC 7009: revoking either token of a pair ends the connection; an unknown token is a no-op. */
  async revokeByToken(token: string, clientId: string): Promise<void> {
    const hash = sha256(token);
    const doc = await McpConnectionModel.findOne({
      client_id: clientId,
      revoked_at: null,
      $or: [{ access_hash: hash }, { refresh_hash: hash }],
    });
    if (doc) await this.revokeDoc(doc, 'revoked by the client');
  },

  async revokeDoc(doc: IMcpConnection, reason: string): Promise<IMcpConnection> {
    const updated = await McpConnectionModel.findOneAndUpdate(
      { _id: doc._id },
      { $set: { revoked_at: doc.revoked_at ?? new Date(), revoked_reason: doc.revoked_reason ?? reason } },
      { new: true }
    ).orFail();
    logs.server.warn('mcp', 'connectionRevoked', { connectionId: String(doc._id), userId: String(doc.user_id), reason });
    return updated;
  },

  /** The server's own decision (a replayed code) — no actor, no scope check. */
  async revokeById(id: string, reason: string): Promise<void> {
    const doc = await McpConnectionModel.findOne({ _id: id, revoked_at: null });
    if (doc) await this.revokeDoc(doc, reason);
  },

  /** From the console: your own connection, or anyone's for an MCP manager. */
  async revoke(id: string, actor: AuthUser) {
    if (!Types.ObjectId.isValid(id)) throw new GraphQLError('Invalid connection id', { extensions: { code: 'BAD_USER_INPUT' } });
    const scope = isMcpManager(actor) ? { _id: id } : { _id: id, user_id: new Types.ObjectId(actor.id) };
    const doc = await McpConnectionModel.findOne(scope);
    if (!doc) throw new GraphQLError('Connection not found', { extensions: { code: 'NOT_FOUND' } });
    const reason = doc.user_id.equals(actor.id) ? 'revoked by its owner' : `revoked by ${actor.email ?? actor.id}`;
    return toConnectionPub(await this.revokeDoc(doc, reason));
  },

  async listForUser(userId: string) {
    const docs = await McpConnectionModel.find({ user_id: new Types.ObjectId(userId) }).sort({ created_at: -1 }).limit(100);
    return docs.map(toConnectionPub);
  },

  /** Managers see every connection; everyone else their own (the owner scope is in the base filter). */
  async table(actor: AuthUser, input?: TableQueryInput | null) {
    const base = isMcpManager(actor) ? {} : { user_id: new Types.ObjectId(actor.id) };
    const page = await runTableQuery<IMcpConnection>(McpConnectionModel, base, input, CONNECTION_TABLE);
    return { rows: page.docs.map(toConnectionPub), total: page.total, page: page.page, page_size: page.page_size };
  },
};
