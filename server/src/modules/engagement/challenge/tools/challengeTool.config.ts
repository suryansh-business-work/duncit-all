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

const MAX_ITEMS = 30;
const MAX_LABEL = 120;

type Raw = Record<string, unknown>;

function boundedNumber(raw: Raw, key: string, fallback: number, min: number, max: number): number {
  const n = Number(raw[key] ?? fallback);
  if (!Number.isFinite(n) || n < min || n > max) bad(`${key} must be between ${min} and ${max}`);
  return n;
}

/** A stable key plus a required label, for any labelled list entry. */
function labelOf(raw: Raw, index: number, prefix: string): { key: string; label: string } {
  const label = String(raw.label ?? '').trim().slice(0, MAX_LABEL);
  if (!label) bad(`Entry ${index + 1} needs a label`);
  return { key: String(raw.key ?? '').trim() || `${prefix}${index + 1}`, label };
}

/** A non-empty list of labelled entries with unique keys. */
function labelled<T extends { key: string }>(field: ConfigField, value: unknown, build: (raw: Raw, index: number) => T, min = 1): T[] {
  if (!Array.isArray(value) || value.length < min) bad(`${field.key} needs at least ${min} entr${min === 1 ? 'y' : 'ies'}`);
  const list = (value as unknown[]).slice(0, MAX_ITEMS).map((raw, i) => build((raw ?? {}) as Raw, i));
  if (new Set(list.map((entry) => entry.key)).size !== list.length) bad(`${field.key} keys must be unique`);
  return list;
}

export interface QuizQuestion {
  key: string;
  label: string;
  options: string[];
  /** Index into `options`. Never sent to players. */
  correct: number;
  points: number;
}

function question(raw: Raw, index: number): QuizQuestion {
  const options = (Array.isArray(raw.options) ? raw.options : [])
    .map((o) => String(o ?? '').trim().slice(0, MAX_LABEL))
    .filter(Boolean)
    .slice(0, 6);
  if (options.length < 2) bad(`Question ${index + 1} needs at least two answers`);
  const correct = Number(raw.correct ?? 0);
  if (!Number.isInteger(correct) || correct < 0 || correct >= options.length) {
    bad(`Question ${index + 1} needs a correct answer from its own list`);
  }
  return { ...labelOf(raw, index, 'q'), options, correct, points: boundedNumber(raw, 'points', 1, 0, 1000) };
}

/** A formula's terms: one weight per scoring tool type, each type at most once. */
function weights(field: ConfigField, value: unknown): { type: string; weight: number }[] {
  if (!Array.isArray(value) || value.length === 0) bad('A formula needs at least one term');
  const list = (value as unknown[]).slice(0, MAX_ITEMS).map((entry) => {
    const raw = (entry ?? {}) as Raw;
    const type = String(raw.type ?? '');
    if (!field.options?.includes(type)) bad('A formula term names a tool that produces no score');
    return { type, weight: boundedNumber(raw, 'weight', 1, -1000, 1000) };
  });
  if (new Set(list.map((term) => term.type)).size !== list.length) bad('Each tool can appear once in a formula');
  return list;
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
    case 'items':
      return labelled(field, value, (raw, i) => ({ ...labelOf(raw, i, 'i'), points: boundedNumber(raw, 'points', 1, -1000, 1000) }));
    case 'options':
      return labelled(field, value, (raw, i) => labelOf(raw, i, 'o'), 2);
    case 'questions':
      return labelled(field, value, question);
    case 'weights':
      return weights(field, value);
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
