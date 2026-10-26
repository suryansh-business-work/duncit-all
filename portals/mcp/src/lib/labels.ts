import type { StatusChipColor } from '@duncit/ui';

/**
 * The server's MCP vocabularies (mcp.schema.ts) and the copy key each value
 * renders as. Every key is written out in full, never composed, so the
 * translation gate can see that it is rendered.
 */

type Translate = (key: string) => string;

interface Vocabulary {
  key: string;
  color: StatusChipColor;
}

/** A tool call's outcome: OK, ERROR, DENIED, BLOCKED or INVALID. */
export const CALL_STATUS: Readonly<Record<string, Vocabulary>> = {
  OK: { key: 'mcp.status.ok', color: 'success' },
  ERROR: { key: 'mcp.status.error', color: 'error' },
  DENIED: { key: 'mcp.status.denied', color: 'warning' },
  BLOCKED: { key: 'mcp.status.blocked', color: 'warning' },
  INVALID: { key: 'mcp.status.invalid', color: 'error' },
};

/** What a tool does: READ, WRITE or DESTRUCTIVE. */
export const TOOL_RISK: Readonly<Record<string, Vocabulary>> = {
  READ: { key: 'mcp.risk.read', color: 'default' },
  WRITE: { key: 'mcp.risk.write', color: 'info' },
  DESTRUCTIVE: { key: 'mcp.risk.destructive', color: 'error' },
};

/** Where a tool comes from: QUERY, MUTATION or CURATED. */
export const TOOL_KIND: Readonly<Record<string, Vocabulary>> = {
  QUERY: { key: 'mcp.kind.query', color: 'default' },
  MUTATION: { key: 'mcp.kind.mutation', color: 'default' },
  CURATED: { key: 'mcp.kind.curated', color: 'default' },
};

/** A connection's state: ACTIVE, REVOKED or EXPIRED. */
export const CONNECTION_STATUS: Readonly<Record<string, Vocabulary>> = {
  ACTIVE: { key: 'mcp.connectionStatus.active', color: 'success' },
  REVOKED: { key: 'mcp.connectionStatus.revoked', color: 'default' },
  EXPIRED: { key: 'mcp.connectionStatus.expired', color: 'warning' },
};

/** The prompt-injection guard modes (GUARD_MODES on the server). */
export const GUARD_MODES = ['block', 'warn'] as const;
export type GuardMode = (typeof GUARD_MODES)[number];
export const GUARD_MODE_KEYS: Readonly<Record<GuardMode, string>> = {
  block: 'mcp.guard.block',
  warn: 'mcp.guard.warn',
};

/** A guard mode in the reader's language; an unknown mode reads as itself. */
export function guardModeLabel(mode: string, t: Translate): string {
  const known = GUARD_MODES.find((candidate) => candidate === mode);
  return known ? t(GUARD_MODE_KEYS[known]) : mode;
}

/** The write scope a connection may hold besides read (SCOPE_WRITE on the server). */
export const SCOPE_WRITE = 'mcp:write';

/** A vocabulary value in the reader's language; an unknown value reads as itself. */
export function vocabularyLabel(vocabulary: Readonly<Record<string, Vocabulary>>, value: string, t: Translate): string {
  const entry = vocabulary[value];
  return entry ? t(entry.key) : value;
}

/** The chip colour a vocabulary value is drawn in. */
export function vocabularyColors(vocabulary: Readonly<Record<string, Vocabulary>>): Record<string, StatusChipColor> {
  return Object.fromEntries(Object.entries(vocabulary).map(([value, entry]) => [value, entry.color]));
}

/** The `enum` column options for a vocabulary, in the reader's language. */
export function vocabularyOptions(vocabulary: Readonly<Record<string, Vocabulary>>, t: Translate) {
  return Object.entries(vocabulary).map(([value, entry]) => ({ value, label: t(entry.key) }));
}

/** "Read only" or "Read & write" for a connection's scopes. */
export function accessLabel(scopes: readonly string[], t: Translate): string {
  return scopes.includes(SCOPE_WRITE) ? t('mcp.access.readWrite') : t('mcp.access.readOnly');
}
