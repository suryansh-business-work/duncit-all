import { GraphQLError } from 'graphql';
import type { EnvFieldDef, EnvFieldValidation, EnvValidationType } from './envEntry.fields';

/**
 * Save-time checks for environment values, driven by each field's
 * `validation` in env-registry.json. The Tech portal runs the same rules in
 * its form; this is the authoritative copy, so an import file or a direct
 * API call cannot store a value the form would refuse.
 *
 * Only the values being saved are checked — an untouched field that predates
 * these rules never blocks an unrelated edit — and `required` applies when an
 * entry is created.
 */

export type EnvConfigValue = string | number | boolean;

export interface EnvFieldIssue {
  /** The config key, e.g. `host`. */
  field: string;
  message: string;
}

const HEX = '0123456789abcdefABCDEF';
const DIGITS = '0123456789';
const onlyFrom = (value: string, allowed: string) => [...value].every((ch) => allowed.includes(ch));
const hasWhitespace = (value: string) => value.split('').some((ch) => ch.trim() === '');

function checkUrl(value: string): string | null {
  try {
    const { protocol } = new URL(value);
    return protocol === 'https:' || protocol === 'http:' ? null : 'must start with https://';
  } catch {
    return 'must be a full URL, e.g. https://example.com';
  }
}

function checkHostname(value: string): string | null {
  const ok = !hasWhitespace(value) && !value.includes('/') && !value.includes(':') && (value.includes('.') || value === 'localhost');
  return ok ? null : 'must be a host name such as smtp.example.com — no https:// or path';
}

/** `name@example.com`, or the `Name <name@example.com>` form a mail header uses. */
function checkEmail(value: string): string | null {
  const open = value.lastIndexOf('<');
  const address = open >= 0 && value.endsWith('>') ? value.slice(open + 1, -1) : value;
  const parts = address.split('@');
  const domain = parts[1] ?? '';
  const ok =
    parts.length === 2 &&
    parts[0] !== '' &&
    !hasWhitespace(address) &&
    domain.includes('.') &&
    !domain.startsWith('.') &&
    !domain.endsWith('.');
  return ok ? null : 'must be an email address, e.g. no-reply@example.com';
}

/** E.164: a plus, then 7 to 15 digits, the first not zero. */
function checkPhone(value: string): string | null {
  const digits = value.slice(1);
  const ok = value.startsWith('+') && digits.length >= 7 && digits.length <= 15 && onlyFrom(digits, DIGITS) && !digits.startsWith('0');
  return ok ? null : 'must be in E.164 format, e.g. +14155552671';
}

function checkJson(value: string): string | null {
  try {
    const parsed: unknown = JSON.parse(value);
    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed) ? null : 'must be a JSON object';
  } catch {
    return 'must be valid JSON — paste the whole key file';
  }
}

function checkPem(value: string): string | null {
  return value.includes('-----BEGIN ') && value.includes('-----END ') ? null : 'must be the whole key file, BEGIN and END lines included';
}

const listItems = (value: string) =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

function checkList(value: string): string | null {
  return value.split(',').every((item) => item.trim() !== '') ? null : 'must be a comma separated list with no empty items';
}

/** One SHA-256 certificate fingerprint: 32 colon-separated hex bytes. */
const isFingerprint = (value: string) => {
  const bytes = value.split(':');
  return bytes.length === 32 && bytes.every((byte) => byte.length === 2 && onlyFrom(byte, HEX));
};

function checkFingerprints(value: string): string | null {
  const items = listItems(value);
  return items.length > 0 && items.every(isFingerprint) ? null : 'must be SHA-256 fingerprints (AA:BB:… 32 bytes), comma separated';
}

function checkNumber(value: EnvConfigValue, rule: EnvFieldValidation): string | null {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return 'must be a number';
  if (rule.min !== undefined && n < rule.min) return `must be at least ${rule.min}`;
  if (rule.max !== undefined && n > rule.max) return `must be at most ${rule.max}`;
  return null;
}

const TEXT_CHECKS: Partial<Record<EnvValidationType, (value: string) => string | null>> = {
  url: checkUrl,
  hostname: checkHostname,
  email: checkEmail,
  phone: checkPhone,
  json: checkJson,
  pem: checkPem,
  list: checkList,
  fingerprints: checkFingerprints,
};

/** The problem with one value, or null when it passes. Blank values are not checked here (see `required`). */
export function checkEnvValue(value: EnvConfigValue, rule: EnvFieldValidation): string | null {
  if (rule.type === 'number') return checkNumber(value, rule);
  const check = TEXT_CHECKS[rule.type];
  return check && typeof value === 'string' ? check(value.trim()) : null;
}

/**
 * Every problem in `config` against the category's fields. Keys the category
 * does not define are ignored (pairsToConfig already drops them).
 */
export function validateEnvConfig(
  fields: readonly EnvFieldDef[],
  config: Readonly<Record<string, EnvConfigValue>>,
  options: { creating: boolean }
): EnvFieldIssue[] {
  const issues: EnvFieldIssue[] = [];
  for (const field of fields) {
    const value = config[field.name];
    if (value === undefined || (typeof value === 'string' && value.trim() === '')) {
      if (options.creating && field.validation.required) issues.push({ field: field.name, message: `${field.label} is required` });
      continue;
    }
    const problem = checkEnvValue(value, field.validation);
    if (problem) issues.push({ field: field.name, message: `${field.label} ${problem}` });
  }
  return issues;
}

/** Throws BAD_USER_INPUT naming the first bad field (and listing all) when `config` fails. */
export function assertValidEnvConfig(
  fields: readonly EnvFieldDef[],
  config: Readonly<Record<string, EnvConfigValue>>,
  options: { creating: boolean }
): void {
  const issues = validateEnvConfig(fields, config, options);
  const [first] = issues;
  if (!first) return;
  throw new GraphQLError(first.message, {
    extensions: { code: 'BAD_USER_INPUT', field: `config.${first.field}`, errors: issues },
  });
}
