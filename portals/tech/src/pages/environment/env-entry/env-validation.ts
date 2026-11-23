import type { EnvFieldDef } from '../queries';

/**
 * The form's copy of the save-time checks the server runs
 * (server/src/modules/platform/envEntry/envEntry.validation.ts), driven by each
 * field's `validation` from env-registry.json. The server is authoritative;
 * this copy only lets the operator see the problem beside the field before
 * submitting. Keep the two in step.
 */

export type EnvProblem =
  | 'url'
  | 'hostname'
  | 'email'
  | 'phone'
  | 'number'
  | 'min'
  | 'max'
  | 'json'
  | 'jsonObject'
  | 'pem'
  | 'list'
  | 'fingerprints';

export interface EnvFinding {
  problem: EnvProblem;
  /** The bound a `min` / `max` finding broke. */
  bound?: number;
}

const HEX = '0123456789abcdefABCDEF';
const DIGITS = '0123456789';
const onlyFrom = (value: string, allowed: string) => [...value].every((ch) => allowed.includes(ch));
const hasWhitespace = (value: string) => value.split('').some((ch) => ch.trim() === '');

function urlFinding(value: string): EnvFinding | null {
  try {
    const { protocol } = new URL(value);
    return protocol === 'https:' || protocol === 'http:' ? null : { problem: 'url' };
  } catch {
    return { problem: 'url' };
  }
}

function hostnameFinding(value: string): EnvFinding | null {
  const ok = !hasWhitespace(value) && !value.includes('/') && !value.includes(':') && (value.includes('.') || value === 'localhost');
  return ok ? null : { problem: 'hostname' };
}

function emailFinding(value: string): EnvFinding | null {
  const open = value.lastIndexOf('<');
  const address = open >= 0 && value.endsWith('>') ? value.slice(open + 1, -1) : value;
  const parts = address.split('@');
  const domain = parts[1] ?? '';
  const ok =
    parts.length === 2 && parts[0] !== '' && !hasWhitespace(address) && domain.includes('.') && !domain.startsWith('.') && !domain.endsWith('.');
  return ok ? null : { problem: 'email' };
}

function phoneFinding(value: string): EnvFinding | null {
  const digits = value.slice(1);
  const ok = value.startsWith('+') && digits.length >= 7 && digits.length <= 15 && onlyFrom(digits, DIGITS) && !digits.startsWith('0');
  return ok ? null : { problem: 'phone' };
}

function jsonFinding(value: string): EnvFinding | null {
  try {
    const parsed: unknown = JSON.parse(value);
    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed) ? null : { problem: 'jsonObject' };
  } catch {
    return { problem: 'json' };
  }
}

const pemFinding = (value: string): EnvFinding | null =>
  value.includes('-----BEGIN ') && value.includes('-----END ') ? null : { problem: 'pem' };

const listFinding = (value: string): EnvFinding | null =>
  value.split(',').every((item) => item.trim() !== '') ? null : { problem: 'list' };

const isFingerprint = (value: string) => {
  const bytes = value.split(':');
  return bytes.length === 32 && bytes.every((byte) => byte.length === 2 && onlyFrom(byte, HEX));
};

function fingerprintsFinding(value: string): EnvFinding | null {
  const items = value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  return items.length > 0 && items.every(isFingerprint) ? null : { problem: 'fingerprints' };
}

function numberFinding(value: string, field: EnvFieldDef): EnvFinding | null {
  const n = Number(value);
  if (!Number.isFinite(n)) return { problem: 'number' };
  const { min, max } = field.validation ?? {};
  if (min != null && n < min) return { problem: 'min', bound: min };
  if (max != null && n > max) return { problem: 'max', bound: max };
  return null;
}

const TEXT_FINDINGS: Record<string, (value: string) => EnvFinding | null> = {
  url: urlFinding,
  hostname: hostnameFinding,
  email: emailFinding,
  phone: phoneFinding,
  json: jsonFinding,
  pem: pemFinding,
  list: listFinding,
  fingerprints: fingerprintsFinding,
};

/** The validation type of a field; a phone field from an older server counts as `phone`. */
export const validationTypeOf = (field: EnvFieldDef): string => field.validation?.type ?? (field.phone ? 'phone' : 'text');

/** What is wrong with a filled-in value, or null. Blank values are the `required` rule's business. */
export function findEnvProblem(field: EnvFieldDef, raw: string): EnvFinding | null {
  const value = raw.trim();
  if (value === '') return null;
  const type = validationTypeOf(field);
  if (type === 'number') return numberFinding(value, field);
  return TEXT_FINDINGS[type]?.(value) ?? null;
}

/**
 * Whether the field must be filled when an entry is created. The registry says
 * so per field; a server too old to send `validation` keeps the old rule (the
 * category's first secret field).
 */
export function isRequiredOnCreate(field: EnvFieldDef, fields: readonly EnvFieldDef[]): boolean {
  if (field.validation) return field.validation.required;
  return fields.find((f) => f.secret) === field;
}
