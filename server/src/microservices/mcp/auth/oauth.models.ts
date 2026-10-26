import { Schema, model, type Document, type Types } from 'mongoose';

/**
 * The MCP OAuth server's three collections.
 *
 * No secret is ever stored in the clear: clients are public (PKCE is what
 * protects the code exchange), and tokens and codes are kept only as SHA-256
 * hashes, so a copy of this database cannot be replayed against the server.
 */

/** A dynamically registered AI client — Claude, ChatGPT, Gemini CLI, … */
export interface IMcpClient extends Document {
  client_id: string;
  client_name: string;
  client_uri: string | null;
  logo_uri: string | null;
  redirect_uris: string[];
  grant_types: string[];
  response_types: string[];
  scope: string | null;
  software_id: string | null;
  software_version: string | null;
  client_id_issued_at: number;
  created_at: Date;
}

const mcpClientSchema = new Schema<IMcpClient>(
  {
    client_id: { type: String, required: true, unique: true },
    client_name: { type: String, required: true },
    client_uri: { type: String, default: null },
    logo_uri: { type: String, default: null },
    redirect_uris: { type: [String], required: true },
    grant_types: { type: [String], default: ['authorization_code', 'refresh_token'] },
    response_types: { type: [String], default: ['code'] },
    scope: { type: String, default: null },
    software_id: { type: String, default: null },
    software_version: { type: String, default: null },
    client_id_issued_at: { type: Number, required: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } }
);

export const McpClientModel = model<IMcpClient>('McpClient', mcpClientSchema);

export type AuthRequestStatus = 'PENDING' | 'APPROVED' | 'DENIED' | 'USED';

/**
 * One trip through the consent page: created by /authorize, decided by the
 * person on mcp.duncit.com/connect, consumed by /token. Purged by TTL.
 */
export interface IMcpAuthRequest extends Document {
  request_id: string;
  client_id: string;
  redirect_uri: string;
  code_challenge: string;
  state: string | null;
  scopes: string[];
  resource: string;
  status: AuthRequestStatus;
  user_id: Types.ObjectId | null;
  granted_scopes: string[];
  code_hash: string | null;
  code_expires_at: Date | null;
  connection_id: Types.ObjectId | null;
  expires_at: Date;
  created_at: Date;
}

const mcpAuthRequestSchema = new Schema<IMcpAuthRequest>(
  {
    request_id: { type: String, required: true, unique: true },
    client_id: { type: String, required: true },
    redirect_uri: { type: String, required: true },
    code_challenge: { type: String, required: true },
    state: { type: String, default: null },
    scopes: { type: [String], default: [] },
    resource: { type: String, required: true },
    status: { type: String, enum: ['PENDING', 'APPROVED', 'DENIED', 'USED'], default: 'PENDING' },
    user_id: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    granted_scopes: { type: [String], default: [] },
    code_hash: { type: String, default: null },
    code_expires_at: { type: Date, default: null },
    connection_id: { type: Schema.Types.ObjectId, default: null },
    expires_at: { type: Date, required: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } }
);
mcpAuthRequestSchema.index({ code_hash: 1 }, { sparse: true });
mcpAuthRequestSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });

export const McpAuthRequestModel = model<IMcpAuthRequest>('McpAuthRequest', mcpAuthRequestSchema);

/**
 * One approved connection — what the console lists under Connections and what
 * Revoke ends. Its access and refresh tokens rotate in place; the previous
 * refresh hash is kept so a replayed (stolen) refresh token ends the
 * connection instead of quietly minting another session.
 */
export interface IMcpConnection extends Document {
  user_id: Types.ObjectId;
  /** Denormalized at approval so the Connections table needs no per-row lookup. */
  user_email: string | null;
  client_id: string;
  client_name: string;
  scopes: string[];
  resource: string;
  access_hash: string;
  access_expires_at: Date;
  refresh_hash: string;
  previous_refresh_hash: string | null;
  refresh_expires_at: Date;
  /** Seconds since the epoch — compared with the account's session seal. */
  issued_at: number;
  revoked_at: Date | null;
  revoked_reason: string | null;
  last_used_at: Date | null;
  last_ip: string | null;
  user_agent: string | null;
  purge_at: Date;
  created_at: Date;
  updated_at: Date;
}

const mcpConnectionSchema = new Schema<IMcpConnection>(
  {
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    user_email: { type: String, default: null },
    client_id: { type: String, required: true },
    client_name: { type: String, required: true },
    scopes: { type: [String], default: [] },
    resource: { type: String, required: true },
    access_hash: { type: String, required: true },
    access_expires_at: { type: Date, required: true },
    refresh_hash: { type: String, required: true },
    previous_refresh_hash: { type: String, default: null },
    refresh_expires_at: { type: Date, required: true },
    issued_at: { type: Number, required: true },
    revoked_at: { type: Date, default: null },
    revoked_reason: { type: String, default: null },
    last_used_at: { type: Date, default: null },
    last_ip: { type: String, default: null },
    user_agent: { type: String, default: null },
    purge_at: { type: Date, required: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);
mcpConnectionSchema.index({ access_hash: 1 }, { unique: true });
mcpConnectionSchema.index({ refresh_hash: 1 }, { unique: true });
mcpConnectionSchema.index({ previous_refresh_hash: 1 }, { sparse: true });
mcpConnectionSchema.index({ user_id: 1, created_at: -1 });
mcpConnectionSchema.index({ purge_at: 1 }, { expireAfterSeconds: 0 });

export const McpConnectionModel = model<IMcpConnection>('McpConnection', mcpConnectionSchema);
