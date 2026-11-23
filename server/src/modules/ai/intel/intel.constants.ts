/**
 * Duncit Intel — shared constants. Kept free of imports so models, services,
 * the GraphQL layer and the tests can all read them without cycles.
 */

/** Account roles that open the Intel console (intel.duncit.com). */
export const INTEL_USER = 'INTEL_USER';
export const INTEL_MANAGER = 'INTEL_MANAGER';
export const INTEL_PORTAL_ROLES = [INTEL_MANAGER, INTEL_USER] as const;

/** The three access levels the product talks about. SUPER_ADMIN always maps to SUPER_ADMIN. */
export const INTEL_LEVELS = ['EMPLOYEE', 'ADMIN', 'SUPER_ADMIN'] as const;
export type IntelLevel = (typeof INTEL_LEVELS)[number];

export const INTEL_ENVIRONMENTS = ['STAGING', 'PRODUCTION'] as const;
export type IntelEnvironment = (typeof INTEL_ENVIRONMENTS)[number];

/** What a conversation reads: one environment, or both side by side. */
export const INTEL_ENV_CHOICES = ['STAGING', 'PRODUCTION', 'BOTH'] as const;
export type IntelEnvChoice = (typeof INTEL_ENV_CHOICES)[number];

/** Knowledge sources. MEDIA is the uploaded-file library; ALL is a conversation-level shorthand. */
export const INTEL_SOURCES = ['MONGODB', 'MCP', 'GITHUB', 'SLACK', 'GMAIL', 'MEDIA'] as const;
export type IntelSource = (typeof INTEL_SOURCES)[number];

/** Connector kinds — every source except MEDIA, which is built in. */
export const INTEL_CONNECTOR_KINDS = ['MONGODB', 'MCP', 'GITHUB', 'SLACK', 'GMAIL'] as const;
export type IntelConnectorKind = (typeof INTEL_CONNECTOR_KINDS)[number];

/**
 * The Tech portal category each connector kind takes its credentials from.
 * Intel never stores a secret: a connector points at one named Tech portal entry.
 */
export const CONNECTOR_ENV_CATEGORY: Record<IntelConnectorKind, string> = {
  MONGODB: 'MONGODB',
  MCP: 'MCP_SERVER',
  GITHUB: 'GITHUB',
  SLACK: 'SLACK',
  GMAIL: 'GMAIL',
};

export const MONGO_ACCESS_MODES = ['READ_ONLY', 'WRITE_ONLY', 'READ_WRITE'] as const;
export type MongoAccessMode = (typeof MONGO_ACCESS_MODES)[number];

export const SOURCE_STATES = ['CONNECTED', 'DISCONNECTED', 'SYNCING', 'ERROR', 'RESTRICTED'] as const;
export type SourceState = (typeof SOURCE_STATES)[number];

export const TOOL_CLASSES = ['READ', 'WRITE', 'DESTRUCTIVE'] as const;
export type ToolClass = (typeof TOOL_CLASSES)[number];

/** Index scopes: one Qdrant collection each. Uploaded files are not tied to an environment. */
export const INDEX_SCOPES = ['STAGING', 'PRODUCTION', 'SHARED'] as const;
export type IndexScope = (typeof INDEX_SCOPES)[number];

export const MEDIA_VISIBILITY = ['PRIVATE', 'TEAM', 'ADMINS'] as const;
export type MediaVisibility = (typeof MEDIA_VISIBILITY)[number];

/** socket.io events a turn streams to the asker's own room. */
export const INTEL_EVENTS = {
  delta: 'intel:delta',
  tool: 'intel:tool',
  done: 'intel:done',
  title: 'intel:title',
  approval: 'intel:approval',
} as const;
export type IntelEvent = keyof typeof INTEL_EVENTS;

/** Ceilings no setting can raise. */
export const INTEL_LIMITS = {
  maxMessageChars: 12_000,
  maxToolRounds: 8,
  maxQueryRows: 50,
  maxSearchResults: 12,
  maxUploadBytes: 100 * 1024 * 1024,
  maxAudioBytes: 20 * 1024 * 1024,
  maxIndexedFileBytes: 400 * 1024,
  maxDocumentChars: 400_000,
  toolResultChars: 14_000,
  approvalPreviewDocs: 5,
} as const;

/** Field names never returned from a live database read, whatever the collection. */
export const SENSITIVE_FIELD_PATTERN = /(pass(word)?|secret|token|api[_-]?key|otp|pin|hash|salt|private[_-]?key|refresh|session|cvv|card[_-]?number)/i;
