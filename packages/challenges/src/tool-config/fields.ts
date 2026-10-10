import { parseJsonObject } from '@duncit/utils';

/**
 * The settings a universal tool exposes, as the server describes them in
 * `config_schema_json`. Framework-free: the same parsing and checks serve every
 * editor (tool defaults, presets, a template's per-instance overrides). The
 * server re-validates everything; these checks only stop a doomed save early.
 */

export type ToolFieldKind =
  | 'number'
  | 'boolean'
  | 'text'
  | 'select'
  | 'number_list'
  | 'criteria'
  | 'items'
  | 'options'
  | 'questions'
  | 'weights';

export interface ToolField {
  key: string;
  kind: ToolFieldKind;
  default: unknown;
  min?: number;
  max?: number;
  options?: string[];
}

export interface JudgeCriterion {
  key: string;
  label: string;
  weight: number;
  max: number;
}

export type ToolConfig = Record<string, unknown>;


const KINDS: readonly ToolFieldKind[] = [
  'number',
  'boolean',
  'text',
  'select',
  'number_list',
  'criteria',
  'items',
  'options',
  'questions',
  'weights',
];

function parseJson(json: string | null | undefined): unknown {
  if (!json) return null;
  try {
    return JSON.parse(json) as unknown;
  } catch {
    return null;
  }
}

export function parseToolFields(json: string | null | undefined): ToolField[] {
  const raw = parseJson(json);
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (f): f is ToolField =>
      !!f && typeof f === 'object' && typeof (f as ToolField).key === 'string' && KINDS.includes((f as ToolField).kind)
  );
}

/** A tool's stored settings (a `*_config_json` field), empty when malformed. */
export const parseToolConfig = (json: string | null | undefined): ToolConfig => parseJsonObject(json);

/** Every field present: the stored value, else the field's default. */
export function withDefaults(fields: ToolField[], config: ToolConfig): ToolConfig {
  return Object.fromEntries(fields.map((f) => [f.key, config[f.key] ?? f.default]));
}

export type ToolConfigIssue = {
  key: string;
  code: 'number' | 'min' | 'max' | 'list' | 'criteria' | 'entries' | 'questions' | 'terms';
};

type Entry = Record<string, unknown>;
const entriesOf = (value: unknown): Entry[] => (Array.isArray(value) ? (value as Entry[]) : []);
const labelled = (list: Entry[]) => list.every((e) => String(e.label ?? '').trim() !== '');

/** A quiz question needs text, at least two answers and a correct answer from its own list. */
function questionOk(q: Entry): boolean {
  const options = Array.isArray(q.options) ? q.options : [];
  const correct = Number(q.correct);
  return String(q.label ?? '').trim() !== '' && options.length >= 2 && Number.isInteger(correct) && correct >= 0 && correct < options.length;
}

/** The list-valued kinds: enough entries, every one complete, nothing repeated. */
function listIssue(f: ToolField, value: unknown): ToolConfigIssue | null {
  const list = entriesOf(value);
  if (f.kind === 'questions') return list.length > 0 && list.every(questionOk) ? null : { key: f.key, code: 'questions' };
  if (f.kind === 'weights') {
    const types = list.map((e) => String(e.type ?? ''));
    const ok = list.length > 0 && new Set(types).size === types.length && list.every((e) => Number.isFinite(Number(e.weight)));
    return ok ? null : { key: f.key, code: 'terms' };
  }
  const min = f.kind === 'options' ? 2 : 1;
  return list.length >= min && labelled(list) ? null : { key: f.key, code: 'entries' };
}

const LIST_KINDS: readonly ToolFieldKind[] = ['items', 'options', 'questions', 'weights'];

function numberIssue(f: ToolField, value: unknown): ToolConfigIssue | null {
  const n = Number(value);
  if (value === '' || value === null || !Number.isFinite(n)) return { key: f.key, code: 'number' };
  if (f.min !== undefined && n < f.min) return { key: f.key, code: 'min' };
  if (f.max !== undefined && n > f.max) return { key: f.key, code: 'max' };
  return null;
}

function criteriaIssue(f: ToolField, value: unknown): ToolConfigIssue | null {
  const list = Array.isArray(value) ? (value as Partial<JudgeCriterion>[]) : [];
  const ok =
    list.length > 0 &&
    list.every((c) => !!c.label?.trim() && Number(c.weight) > 0 && Number(c.max) >= 1 && Number(c.max) <= 100);
  return ok ? null : { key: f.key, code: 'criteria' };
}

/** What would make the server refuse this configuration, field by field. */
export function toolConfigIssues(fields: ToolField[], config: ToolConfig): ToolConfigIssue[] {
  return fields.flatMap((f) => {
    const value = config[f.key];
    let issue: ToolConfigIssue | null = null;
    if (f.kind === 'number') issue = numberIssue(f, value);
    if (f.kind === 'number_list') {
      const list = Array.isArray(value) ? value : [];
      if (!list.length || list.some((n) => !Number.isFinite(Number(n)) || Number(n) === 0)) {
        issue = { key: f.key, code: 'list' };
      }
    }
    if (f.kind === 'criteria') issue = criteriaIssue(f, value);
    if (LIST_KINDS.includes(f.kind)) issue = listIssue(f, value);
    return issue ? [issue] : [];
  });
}
