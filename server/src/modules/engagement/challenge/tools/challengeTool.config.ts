import { GraphQLError } from 'graphql';
import { toolDefinition, type ConfigField } from './challengeTool.catalogue';

/**
 * Validates and normalises a tool configuration against the tool's field list.
 *
 * Unknown keys are dropped (a stale client cannot smuggle settings the engine
 * never reads), missing keys take the base value, and every value is coerced to
 * its field kind or rejected. The result is what gets snapshotted onto a pod
 * challenge, so a later edit to the tool never reaches a challenge in progress.
 */

export interface JudgeCriterion {
  key: string;
  label: string;
  weight: number;
  max: number;
}

export type ToolConfig = Record<string, unknown>;

function bad(message: string): never {
  throw new GraphQLError(message, { extensions: { code: 'BAD_USER_INPUT' } });
}

function inRange(field: ConfigField, n: number): number {
  if (!Number.isFinite(n)) bad(`${field.key} must be a number`);
  if (field.min !== undefined && n < field.min) bad(`${field.key} must be at least ${field.min}`);
  if (field.max !== undefined && n > field.max) bad(`${field.key} must be at most ${field.max}`);
  return n;
}

const MAX_TEXT = 40;
const MAX_LIST = 12;
const MAX_CRITERIA = 10;

function criterion(raw: unknown, index: number): JudgeCriterion {
  const c = (raw ?? {}) as Record<string, unknown>;
  const label = String(c.label ?? '').trim().slice(0, MAX_TEXT);
  if (!label) bad(`Criterion ${index + 1} needs a label`);
  const weight = Number(c.weight ?? 1);
  const max = Number(c.max ?? 10);
  if (!Number.isFinite(weight) || weight <= 0) bad(`Criterion ${index + 1} weight must be positive`);
  if (!Number.isFinite(max) || max < 1 || max > 100) bad(`Criterion ${index + 1} max must be 1-100`);
  const key = String(c.key ?? '').trim() || `c${index + 1}`;
  return { key, label, weight, max };
}

function coerce(field: ConfigField, value: unknown): unknown {
  switch (field.kind) {
    case 'number':
      return inRange(field, Number(value));
    case 'boolean':
      if (typeof value !== 'boolean') bad(`${field.key} must be on or off`);
      return value;
    case 'text':
      return String(value ?? '').trim().slice(0, MAX_TEXT);
    case 'select':
      if (!field.options?.includes(String(value))) bad(`${field.key} has an unsupported value`);
      return String(value);
    case 'number_list': {
      if (!Array.isArray(value) || value.length === 0) bad(`${field.key} needs at least one value`);
      const list = (value as unknown[]).slice(0, MAX_LIST).map(Number);
      if (list.some((n) => !Number.isFinite(n) || n === 0)) bad(`${field.key} values must be non-zero numbers`);
      return [...new Set(list)];
    }
    case 'criteria': {
      if (!Array.isArray(value) || value.length === 0) bad('At least one judging criterion is required');
      const list = (value as unknown[]).slice(0, MAX_CRITERIA).map(criterion);
      if (new Set(list.map((c) => c.key)).size !== list.length) bad('Criterion keys must be unique');
      return list;
    }
  }
}

/**
 * @param base the values to start from (the tool's admin defaults, or a
 *   preset); `override` wins key by key.
 */
export function normalizeToolConfig(type: string, base: ToolConfig, override?: ToolConfig | null): ToolConfig {
  const def = toolDefinition(type);
  if (!def) bad(`Unknown tool type ${type}`);
  const merged = { ...base, ...(override ?? {}) };
  const out: ToolConfig = {};
  for (const field of def.fields) {
    out[field.key] = coerce(field, merged[field.key] ?? field.default);
  }
  return out;
}

/** The catalogue defaults for a tool type, already normalised. */
export function catalogueDefaults(type: string): ToolConfig {
  return normalizeToolConfig(type, {});
}

/** Parses a `config_json` argument; malformed JSON is a user error, not a 500. */
export function parseConfigJson(json: string | null | undefined): ToolConfig | null {
  if (json === null || json === undefined || json === '') return null;
  try {
    const parsed: unknown = JSON.parse(json);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) bad('Configuration must be an object');
    return parsed as ToolConfig;
  } catch (err) {
    if (err instanceof GraphQLError) throw err;
    return bad('Configuration is not valid JSON');
  }
}
