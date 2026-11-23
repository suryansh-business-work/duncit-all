import { ENV_CATEGORIES, type EnvCategory } from './envEntry.model';
import registry from './env-registry.json';

/**
 * The Tech portal's environment catalogue, loaded from `env-registry.json`.
 *
 * That JSON file is the single source of truth for every environment value
 * Duncit reads: each category, each field's label, hint, description (why it is
 * used), validation and the files that read it, plus the few GitHub secrets
 * that cannot move here. This module only parses it once at load — failing
 * fast on a malformed entry — and keeps the exports every caller already uses.
 * Edit the JSON, not this file; `node scripts/audit-env-registry.mjs` keeps
 * its `usedIn` lists honest.
 */

export const ENV_VALIDATION_TYPES = [
  'text',
  'url',
  'hostname',
  'email',
  'phone',
  'number',
  'bool',
  'json',
  'pem',
  'list',
  'fingerprints',
] as const;
export type EnvValidationType = (typeof ENV_VALIDATION_TYPES)[number];

/** How a field's value is checked when it is saved. `required` applies when an entry is created. */
export interface EnvFieldValidation {
  type: EnvValidationType;
  required?: boolean;
  min?: number;
  max?: number;
}

/**
 * A config field for a category. `secret` fields are rendered as masked inputs
 * (eye-toggle on the client) but their values ARE returned so they can be
 * reviewed/edited in the Tech portal. `hint` shows the expected key format.
 */
export interface EnvFieldDef {
  name: string;
  label: string;
  secret?: boolean;
  number?: boolean;
  bool?: boolean;
  hint?: string;
  phone?: boolean;
  /** The legacy env key `getRuntimeEnvValue` resolves to this field, if any. */
  envKey?: string;
  /** Why the value is used — what breaks without it. */
  description: string;
  validation: EnvFieldValidation;
  /** Files that read this field through its env key (generated). */
  usedIn: string[];
}

interface EnvCategoryEntry {
  label: string;
  description: string;
  docUrl: string;
  apiDocsUrl?: string;
  /** Files that read the category directly (generated). */
  usedIn: string[];
  fields: EnvFieldDef[];
}

export interface EnvCategoryGroup {
  key: string;
  label: string;
  description: string;
  categories: readonly EnvCategory[];
}

type Json = Record<string, unknown>;

function fail(where: string, problem: string): never {
  throw new Error(`env-registry.json: ${where} ${problem}`);
}

const isRecord = (value: unknown): value is Json => typeof value === 'object' && value !== null && !Array.isArray(value);

export const isEnvCategory = (value: unknown): value is EnvCategory =>
  typeof value === 'string' && (ENV_CATEGORIES as readonly string[]).includes(value);

const isValidationType = (value: unknown): value is EnvValidationType =>
  typeof value === 'string' && (ENV_VALIDATION_TYPES as readonly string[]).includes(value);

function text(obj: Json, key: string, where: string): string {
  const value = obj[key];
  if (typeof value !== 'string' || value.trim() === '') fail(where, `needs a non-empty "${key}"`);
  return value;
}

function optionalText(obj: Json, key: string, where: string): string | undefined {
  if (obj[key] === undefined) return undefined;
  return text(obj, key, where);
}

function optionalNumber(obj: Json, key: string, where: string): number | undefined {
  const value = obj[key];
  if (value === undefined) return undefined;
  if (typeof value !== 'number' || !Number.isFinite(value)) fail(where, `"${key}" must be a number`);
  return value;
}

function textList(obj: Json, key: string, where: string): string[] {
  const value = obj[key];
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) fail(where, `"${key}" must be a list of strings`);
  return value.map(String);
}

type FieldFlags = Pick<EnvFieldDef, 'secret' | 'number' | 'bool' | 'phone'>;

/** The input-kind switches a field turns on; absent means off. */
function flags(obj: Json): FieldFlags {
  const out: FieldFlags = {};
  if (obj.secret === true) out.secret = true;
  if (obj.number === true) out.number = true;
  if (obj.bool === true) out.bool = true;
  if (obj.phone === true) out.phone = true;
  return out;
}

function readValidation(raw: unknown, where: string): EnvFieldValidation {
  if (!isRecord(raw) || !isValidationType(raw.type)) fail(where, `needs validation.type (one of ${ENV_VALIDATION_TYPES.join(', ')})`);
  const min = optionalNumber(raw, 'min', where);
  const max = optionalNumber(raw, 'max', where);
  return {
    type: raw.type,
    ...(raw.required === true ? { required: true } : {}),
    ...(min === undefined ? {} : { min }),
    ...(max === undefined ? {} : { max }),
  };
}

function readField(raw: unknown, where: string): EnvFieldDef {
  if (!isRecord(raw)) fail(where, 'must be an object');
  const name = text(raw, 'name', where);
  const at = `${where}.${name}`;
  const hint = optionalText(raw, 'hint', at);
  const envKey = optionalText(raw, 'envKey', at);
  return {
    name,
    label: text(raw, 'label', at),
    ...(hint === undefined ? {} : { hint }),
    ...flags(raw),
    ...(envKey === undefined ? {} : { envKey }),
    description: text(raw, 'description', at),
    validation: readValidation(raw.validation, at),
    usedIn: textList(raw, 'usedIn', at),
  };
}

function readCategory(raw: unknown, category: string): EnvCategoryEntry {
  if (!isRecord(raw)) fail(category, 'is missing');
  const fields = raw.fields;
  if (!Array.isArray(fields) || fields.length === 0) fail(category, 'needs at least one field');
  const apiDocsUrl = optionalText(raw, 'apiDocsUrl', category);
  return {
    label: text(raw, 'label', category),
    description: text(raw, 'description', category),
    docUrl: text(raw, 'docUrl', category),
    ...(apiDocsUrl === undefined ? {} : { apiDocsUrl }),
    usedIn: textList(raw, 'usedIn', category),
    fields: fields.map((field) => readField(field, category)),
  };
}

function readGroup(raw: unknown, index: number): EnvCategoryGroup {
  const where = `groups[${index}]`;
  if (!isRecord(raw)) fail(where, 'must be an object');
  const categories = textList(raw, 'categories', where);
  const unknown = categories.filter((category) => !isEnvCategory(category));
  if (unknown.length > 0) fail(where, `names unknown categories: ${unknown.join(', ')}`);
  return {
    key: text(raw, 'key', where),
    label: text(raw, 'label', where),
    description: text(raw, 'description', where),
    categories: categories.filter(isEnvCategory),
  };
}

/** Parse and check a registry document. Exported for tests; the module parses the real file once. */
export function parseEnvRegistry(raw: unknown): { categories: ReadonlyMap<EnvCategory, EnvCategoryEntry>; groups: EnvCategoryGroup[] } {
  if (!isRecord(raw) || !isRecord(raw.categories) || !Array.isArray(raw.groups)) fail('root', 'needs "categories" and "groups"');
  const rawCategories = raw.categories;
  const extra = Object.keys(rawCategories).filter((category) => !isEnvCategory(category));
  if (extra.length > 0) fail('categories', `not in ENV_CATEGORIES: ${extra.join(', ')}`);
  const categories = new Map(ENV_CATEGORIES.map((category) => [category, readCategory(rawCategories[category], category)] as const));
  const envKeys = [...categories.values()].flatMap((entry) => entry.fields.flatMap((field) => (field.envKey ? [field.envKey] : [])));
  const duplicate = envKeys.find((key, index) => envKeys.indexOf(key) !== index);
  if (duplicate) fail('categories', `map env key ${duplicate} twice`);
  return { categories, groups: raw.groups.map(readGroup) };
}

const REGISTRY = parseEnvRegistry(registry);

/** The parsed entry of a category; total, because the parser requires one per ENV_CATEGORIES member. */
function entryOf(category: EnvCategory): EnvCategoryEntry {
  const entry = REGISTRY.categories.get(category);
  if (!entry) throw new Error(`No registry entry for ${category}`);
  return entry;
}

function byCategory<T>(pick: (entry: EnvCategoryEntry) => T): Record<EnvCategory, T> {
  const out: Partial<Record<EnvCategory, T>> = {};
  for (const category of ENV_CATEGORIES) out[category] = pick(entryOf(category));
  return out as Record<EnvCategory, T>;
}

/** Field layout per category. Keys match the stored `config`. */
export const CATEGORY_FIELDS: Record<EnvCategory, EnvFieldDef[]> = byCategory((entry) => entry.fields);

/** How each category is named in the Tech portal and on the Analytics console. */
export const CATEGORY_LABELS: Record<EnvCategory, string> = byCategory((entry) => entry.label);

/** One line under each category's title in the Tech portal: what the keys power. */
export const CATEGORY_DESCRIPTIONS: Record<EnvCategory, string> = byCategory((entry) => entry.description);

/** Where an operator obtains each category's credentials (shown in the Add dialog). */
export const CATEGORY_DOCS: Record<EnvCategory, string> = byCategory((entry) => entry.docUrl);

/** Where each category's API reference lives, for the ones worth reading. */
export const CATEGORY_API_DOCS: Partial<Record<EnvCategory, string>> = Object.fromEntries(
  ENV_CATEGORIES.flatMap((category) => {
    const url = entryOf(category).apiDocsUrl;
    return url ? [[category, url]] : [];
  })
);

/** Files that read each category directly (generated into the registry). */
export const CATEGORY_USED_IN: Record<EnvCategory, string[]> = byCategory((entry) => entry.usedIn);

/**
 * How the Tech portal's sidebar groups the categories, in display order. Every
 * category belongs to exactly one group — the guard below throws on a miss.
 */
export const CATEGORY_GROUPS: readonly EnvCategoryGroup[] = REGISTRY.groups;

/** The group a category sits in — total, because every category is placed exactly once. */
export const CATEGORY_GROUP_OF = new Map(
  CATEGORY_GROUPS.flatMap((group) => group.categories.map((category) => [category, group] as const))
);

/** The group a category sits in; the check below guarantees every category has one. */
export function groupOf(category: EnvCategory) {
  const group = CATEGORY_GROUP_OF.get(category);
  if (!group) throw new Error(`No sidebar group for ${category}`);
  return group;
}

/** Fails fast, at load, when a category exists that no sidebar group lists — it would be invisible in the portal. */
export function assertEveryCategoryGrouped(categories: readonly string[], isGrouped: (category: string) => boolean): void {
  const ungrouped = categories.filter((category) => !isGrouped(category));
  if (ungrouped.length > 0) {
    throw new Error(`Env categories with no sidebar group: ${ungrouped.join(', ')}. Add them to CATEGORY_GROUPS.`);
  }
}

assertEveryCategoryGrouped(ENV_CATEGORIES, (category) => isEnvCategory(category) && CATEGORY_GROUP_OF.has(category));

/** Union of all secret field names across categories. */
export const SECRET_FIELDS: string[] = Array.from(
  new Set(Object.values(CATEGORY_FIELDS).flatMap((fields) => fields.filter((f) => f.secret).map((f) => f.name)))
);

/**
 * Maps a legacy server env key to the category + config field it now resolves
 * from (every field with an `envKey` in the registry). Anything not listed
 * falls through to process.env unchanged.
 */
export const ENV_KEY_MAP: Record<string, { category: EnvCategory; field: string }> = Object.fromEntries(
  ENV_CATEGORIES.flatMap((category) =>
    CATEGORY_FIELDS[category].flatMap((field) => (field.envKey ? [[field.envKey, { category, field: field.name }]] : []))
  )
);

export function maskSecret(value: string) {
  if (!value) return '';
  if (value.length <= 6) return '••••••';
  return `${value.slice(0, 3)}••••••${value.slice(-3)}`;
}
