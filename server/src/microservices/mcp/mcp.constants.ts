/**
 * Fixed protocol and safety limits for the MCP service. Business data (prices,
 * trusted client hosts, which tools are switched off) lives in McpSettings and
 * is edited from the MCP console — nothing here is something an operator
 * would want to change without a code review.
 */

/** The portal key of the MCP console itself (PORTAL_ROLE_REQUIREMENTS.mcp). */
export const MCP_PORTAL_KEY = 'mcp';

/** The gateway is served at `/mcp`; every other endpoint at `/<key>/mcp`. */
export const GATEWAY_ENDPOINT = 'gateway';

/** Everyone may read; writing needs a connection the person granted write on. */
export const SCOPE_READ = 'mcp:read';
export const SCOPE_WRITE = 'mcp:write';
export const SUPPORTED_SCOPES = [SCOPE_READ, SCOPE_WRITE] as const;

/** Who sees everyone's usage and owns the settings, as opposed to their own. */
export const MCP_MANAGER_ROLES = ['SUPER_ADMIN', 'MCP_MANAGER'] as const;

export const ACCESS_TOKEN_PREFIX = 'dmcp_at_';
export const REFRESH_TOKEN_PREFIX = 'dmcp_rt_';
export const ACCESS_TOKEN_TTL_SECONDS = 60 * 60;
/** Sliding: every refresh starts the window again. */
export const REFRESH_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60;
/** How long a person has to sign in and approve on the consent page. */
export const AUTH_REQUEST_TTL_SECONDS = 10 * 60;
/** How long the client has to exchange an approved code. */
export const AUTH_CODE_TTL_SECONDS = 2 * 60;
/** A revoked or lapsed connection stays listed this long, then is purged. */
export const CONNECTION_RETENTION_SECONDS = 90 * 24 * 60 * 60;
/** last_used_at is written at most this often per connection. */
export const LAST_USED_WRITE_INTERVAL_MS = 60 * 1000;

/**
 * The parameters every tool takes on top of its own. Prefixed so they can
 * never collide with a GraphQL argument of the same name (`reason` is common).
 */
export const META_REASON = 'mcp_reason';
export const META_GUARD = 'mcp_guard';
export const META_CONFIRM = 'mcp_confirm';
export const META_PARAMS = [META_REASON, META_GUARD, META_CONFIRM] as const;

export const GUARD_MODES = ['block', 'warn'] as const;
export type GuardMode = (typeof GUARD_MODES)[number];

export const REASON_MIN_LENGTH = 3;
export const REASON_MAX_LENGTH = 500;

/** Input limits, checked before anything reaches GraphQL. */
export const MAX_ARGS_BYTES = 256 * 1024;
export const MAX_STRING_LENGTH = 20_000;
export const MAX_ARG_DEPTH = 10;
/** Nested input objects deeper than this are described as a plain object. */
export const MAX_INPUT_SCHEMA_DEPTH = 4;
/** A result larger than this is cut, with a note to page instead. */
export const MAX_RESULT_CHARS = 200_000;

/** Characters per token for the context-cost estimate (a standard heuristic). */
export const CHARS_PER_TOKEN = 4;

/** The tool name rule shared by every MCP client we target (OpenAI's is the tightest). */
export const TOOL_NAME_PATTERN = /^[a-z0-9_]{1,64}$/;
