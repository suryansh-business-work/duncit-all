import { z } from 'zod';

/*
  Field builders for the server's Zod validators.

  The server validated with Yup for years, and every client was written against
  what Yup did: it CAST before it checked ("5" is the number 5, 5 is the string
  "5", "true" is true), it filled defaults, it reported every failure in key
  order, and its messages name the field ("email is a required field"). These
  builders keep that contract on Zod, so the move changed the library and
  nothing a caller can observe.

  A field is `kind(inner, rules)`: `inner` is a plain Zod schema carrying the
  field's checks (and `.nullable()` / `.optional()` when it allows those), and
  `rules` carries what has to happen BEFORE those checks run — the cast, the
  trim, the default, the required/one-of messages.
*/

type Path = readonly PropertyKey[];
type Render = (path: string) => string;
type Transform = (value: unknown) => unknown;
type UnknownRecord = Record<string, unknown>;

// ---------------------------------------------------------------- messages

/** `a.b`, `list[0].c`, `obj["dotted.key"]` — the path a message names; `this` for the root. */
export function fieldPath(path: Path = []): string {
  let out = '';
  for (const key of path) {
    if (typeof key === 'number') {
      out += `[${key}]`;
    } else if (String(key).includes('.')) {
      out += `["${String(key)}"]`;
    } else {
      out += out ? `.${String(key)}` : String(key);
    }
  }
  return out || 'this';
}

/** A message that names the field it is about, rendered once the path is known. */
const named =
  (render: Render) =>
  (issue: { readonly path?: Path }): string =>
    render(fieldPath(issue.path));

function printNumber(value: number): string {
  if (Number.isNaN(value)) return 'NaN';
  return value === 0 && 1 / value < 0 ? '-0' : String(value);
}

function printSimple(value: unknown, quote: boolean): string | null {
  if (value == null || typeof value === 'boolean') return String(value);
  if (typeof value === 'number') return printNumber(value);
  if (typeof value === 'string') return quote ? `"${value}"` : value;
  if (typeof value === 'function') return `[Function ${value.name || 'anonymous'}]`;
  if (typeof value === 'symbol') return value.toString();
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? String(value) : value.toISOString();
  if (value instanceof Error) return `[${Error.prototype.toString.call(value)}]`;
  if (value instanceof RegExp) return value.toString();
  return null;
}

/** How a value reads inside a message — `"text"`, `NaN`, an ISO date, indented JSON. */
export function printValue(value: unknown, quote = false): string {
  const simple = printSimple(value, quote);
  if (simple !== null) return simple;
  return JSON.stringify(
    value,
    function replacer(this: UnknownRecord, key: string, nested: unknown) {
      return printSimple(this[key], quote) ?? nested;
    },
    2
  );
}

function typeMessage(path: string, type: string, value: unknown, original: unknown): string {
  const castFrom = printValue(original, true);
  const suffix = original != null && original !== value ? ` (cast from the value \`${castFrom}\`).` : '.';
  return `${path} must be a \`${type}\` type, but the final value was: \`${printValue(value, true)}\`${suffix}`;
}

/** Carries a rendered message on an issue raised before the path is known. */
const MESSAGE_CARRIER = z.custom(() => true, {
  error: (issue) => (issue.params as { render: Render }).render(fieldPath(issue.path)),
});

// ---------------------------------------------------------------- casts

const isNumber = (value: unknown): value is number => typeof value === 'number' && !Number.isNaN(value);
const isValidDate = (value: unknown): value is Date => value instanceof Date && !Number.isNaN(value.getTime());
const isRecord = (value: unknown): value is UnknownRecord =>
  Object.prototype.toString.call(value) === '[object Object]' || typeof value === 'function';

function castString(value: unknown): unknown {
  if (typeof value === 'string' || Array.isArray(value) || value == null) return value;
  const { toString } = value as { toString?: unknown };
  if (!toString) return value;
  const text = (value as { toString(): string }).toString();
  return text === '[object Object]' ? value : text;
}

function castNumber(value: unknown): unknown {
  let parsed = value;
  if (typeof value === 'string') {
    const compact = value.replaceAll(/\s/g, '');
    if (compact === '') return Number.NaN;
    parsed = +compact;
  }
  if (isNumber(parsed) || parsed === null) return parsed;
  return Number.parseFloat(parsed as string);
}

function castBoolean(value: unknown): unknown {
  if (typeof value === 'boolean') return value;
  if (/^(true|1)$/i.test(String(value))) return true;
  if (/^(false|0)$/i.test(String(value))) return false;
  return value;
}

// ISO 8601 with progressive enhancement — a bare date or time is LOCAL time.
// Yup's own parser, verbatim: splitting it changes which optional group a
// string like "2026101230" falls back to. It is anchored and every group takes
// a fixed number of digits, so backtracking is bounded (no ReDoS).
const ISO_DATE =
  /^(\d{4}|[+-]\d{6})(?:-?(\d{2})(?:-?(\d{2}))?)?(?:[ T]?(\d{2}):?(\d{2})(?::?(\d{2})(?:[,.](\d+))?)?(?:(Z)|([+-])(\d{2})(?::?(\d{2}))?)?)?$/; // NOSONAR — S5843, see above
const part = (text: string | undefined, fallback = 0) => Number(text) || fallback;

function parseIsoDate(value: unknown): number {
  // Both coerce to a string themselves, exactly as Yup let them.
  const m = ISO_DATE.exec(value as string);
  if (!m) return Date.parse(value as string);
  const [year, month, day] = [part(m[1]), part(m[2], 1) - 1, part(m[3], 1)];
  const [hour, minute, second] = [part(m[4]), part(m[5]), part(m[6])];
  const millisecond = m[7] ? part(m[7].substring(0, 3)) : 0;
  if (m[8] === undefined && m[9] === undefined) {
    return new Date(year, month, day, hour, minute, second, millisecond).valueOf();
  }
  let offset = 0;
  if (m[8] !== 'Z' && m[9] !== undefined) {
    offset = part(m[10]) * 60 + part(m[11]);
    if (m[9] === '+') offset = 0 - offset;
  }
  return Date.UTC(year, month, day, hour, minute + offset, second, millisecond);
}

function castDate(value: unknown): unknown {
  if (isValidDate(value) || value === null) return value;
  const time = parseIsoDate(value);
  return Number.isNaN(time) ? new Date('') : new Date(time);
}

interface Kind {
  readonly type: string;
  readonly cast?: Transform;
  readonly is: (value: unknown) => boolean;
}

const KINDS = {
  string: { type: 'string', cast: castString, is: (v: unknown) => typeof v === 'string' },
  number: { type: 'number', cast: castNumber, is: isNumber },
  boolean: { type: 'boolean', cast: castBoolean, is: (v: unknown) => typeof v === 'boolean' },
  date: { type: 'date', cast: castDate, is: isValidDate },
  mixed: { type: 'mixed', is: () => true },
  array: { type: 'array', is: Array.isArray },
  object: { type: 'object', is: isRecord },
} satisfies Record<string, Kind>;

// ---------------------------------------------------------------- fields

export interface FieldRules {
  /** Refuse undefined and null with this message (`true` — the default one). */
  readonly required?: string | true;
  /** Filled in for undefined, after the cast and before any check. */
  readonly default?: unknown;
  /** The only values allowed (null/undefined are judged by `inner`). */
  readonly oneOf?: readonly unknown[];
  /** Replaces the default "must be a `number` type" message. */
  readonly typeError?: string;
  /** Run in order after the type cast — `trim`, `lowercase`, … */
  readonly transforms?: readonly Transform[];
}

export const trim: Transform = (val) => (val == null ? val : (val as string).trim());
export const lowercase: Transform = (value) => (value == null ? value : (value as string).toLowerCase());
export const uppercase: Transform = (value) => (value == null ? value : (value as string).toUpperCase());

function initial(kind: Kind, rules: FieldRules): unknown {
  if ('default' in rules) {
    const fallback = rules.default;
    return fallback !== null && typeof fallback === 'object' ? structuredClone(fallback) : fallback;
  }
  // An object nobody sent is built from its own fields' defaults.
  return kind === KINDS.object ? {} : undefined;
}

interface Accepts {
  readonly null: boolean;
  readonly undefined: boolean;
}

function requiredMessage(rules: FieldRules): Render {
  const { required } = rules;
  if (typeof required === 'string') return () => required;
  return (p) => `${p} is a required field`;
}

/** A present value of the wrong type. */
function typeProblem(kind: Kind, rules: FieldRules, value: unknown, original: unknown): Render | null {
  if (value == null || kind.is(value)) return null;
  const { typeError } = rules;
  if (typeError) return () => typeError;
  return (p) => typeMessage(p, kind.type, value, original);
}

/** null or undefined where the inner schema refuses it. */
function absenceProblem(rules: FieldRules, accepts: Accepts, value: unknown): Render | null {
  if (value === null && !accepts.null) {
    if (rules.required) return requiredMessage(rules);
    return (p) => `${p} cannot be null`;
  }
  if (value === undefined && !accepts.undefined) return requiredMessage(rules);
  return null;
}

/** A present value outside `oneOf`. */
function oneOfProblem(rules: FieldRules, value: unknown): Render | null {
  if (!rules.oneOf || value == null || rules.oneOf.includes(value)) return null;
  const values = rules.oneOf.join(', ');
  return (p) => `${p} must be one of the following values: ${values}`;
}

/** Yup's own checks for one field, in Yup's order. */
function internalProblems(kind: Kind, rules: FieldRules, accepts: Accepts, value: unknown, original: unknown): Render[] {
  return [
    typeProblem(kind, rules, value, original),
    absenceProblem(rules, accepts, value),
    oneOfProblem(rules, value),
  ].filter((problem): problem is Render => problem !== null);
}

function field<S extends z.ZodType>(kind: Kind, inner: S, rules: FieldRules = {}) {
  const accepts = { null: inner.safeParse(null).success, undefined: inner.safeParse(undefined).success };
  return z.preprocess((original: unknown, ctx) => {
    let value = original;
    if (value !== undefined) {
      value = kind.cast ? kind.cast(value) : value;
      for (const transform of rules.transforms ?? []) value = transform(value);
    }
    if (value === undefined) value = initial(kind, rules);
    for (const render of internalProblems(kind, rules, accepts, value, original)) {
      ctx.addIssue({ code: 'custom', input: original, inst: MESSAGE_CARRIER, params: { render } });
    }
    return value;
  }, inner);
}

export const str = <S extends z.ZodType>(inner: S, rules?: FieldRules) => field(KINDS.string, inner, rules);
export const num = <S extends z.ZodType>(inner: S, rules?: FieldRules) => field(KINDS.number, inner, rules);
export const bool = <S extends z.ZodType>(inner: S, rules?: FieldRules) => field(KINDS.boolean, inner, rules);
export const date = <S extends z.ZodType>(inner: S, rules?: FieldRules) => field(KINDS.date, inner, rules);
export const mixed = <S extends z.ZodType>(inner: S, rules?: FieldRules) => field(KINDS.mixed, inner, rules);
export const arr = <S extends z.ZodType>(inner: S, rules?: FieldRules) => field(KINDS.array, inner, rules);
export const obj = <S extends z.ZodType>(inner: S, rules?: FieldRules) => field(KINDS.object, inner, rules);

/** Any number Yup accepted — Infinity included, NaN already refused as a type error. */
export const finite = () => z.custom<number>((value) => typeof value === 'number');

// ---------------------------------------------------------------- objects

export interface ShapeOptions<F extends z.ZodRawShape> {
  /** Keep keys the shape does not name (Yup validated without `stripUnknown`). */
  readonly loose?: boolean;
  /** Re-judge a field with a stricter schema when its siblings call for it. */
  readonly when?: { readonly [K in keyof F]?: (parent: UnknownRecord) => z.ZodType | undefined };
  /** Whole-object rules, reported after every field's own. */
  readonly tests?: readonly { readonly message: string; readonly test: (value: UnknownRecord) => boolean }[];
}

/*
  Yup's report order, kept because clients show the first message: fields are
  visited last-to-first, then ranked by the first key whose name appears in the
  failing path. Most fields simply land in key order; a field whose name
  contains an earlier one (`assigned_city` holds `city`) ranks with it, and
  ahead of it.
*/
function reportOrder(keys: readonly string[]) {
  const rank = (issue: z.core.$ZodRawIssue) => {
    const path = fieldPath(issue.path);
    const index = keys.findIndex((key) => path.includes(key));
    return index === -1 ? Infinity : index;
  };
  const visit = (issue: z.core.$ZodRawIssue) => keys.indexOf(String(issue.path?.[0]));
  return (a: z.core.$ZodRawIssue, b: z.core.$ZodRawIssue) => rank(a) - rank(b) || visit(b) - visit(a);
}

function applyWhen(
  when: NonNullable<ShapeOptions<z.ZodRawShape>['when']>,
  value: UnknownRecord,
  issues: z.core.$ZodRawIssue[]
): void {
  for (const [key, pick] of Object.entries(when)) {
    const branch = pick?.(value);
    if (!branch) continue;
    const result = z.object({ [key]: branch }).safeParse({ [key]: value[key] });
    for (let i = issues.length - 1; i >= 0; i -= 1) {
      if (issues[i].path?.[0] === key) issues.splice(i, 1);
    }
    // Already finalised (messages rendered), which a raw issue list accepts as-is.
    if (!result.success) issues.push(...(result.error.issues as z.core.$ZodRawIssue[]));
  }
}

/**
 * An object of fields. Unknown keys are dropped (unless `loose`), fields that
 * end up undefined are left out, and failures are reported in key order with
 * whole-object rules last.
 */
export function shape<F extends z.ZodRawShape>(fields: F, options: ShapeOptions<F> = {}) {
  const keys = Object.keys(fields);
  const order = reportOrder(keys);
  const base = options.loose ? z.looseObject(fields) : z.object(fields);
  return base
    .superRefine(
      (value, ctx) => {
        const record = value as UnknownRecord;
        if (options.when) applyWhen(options.when, record, ctx.issues);
        ctx.issues.sort(order);
        for (const { message, test } of options.tests ?? []) {
          if (!test(record)) ctx.addIssue({ code: 'custom', message, input: value });
        }
      },
      { when: (payload) => isRecord(payload.value) }
    )
    .transform((value) => {
      const out = { ...value };
      for (const key of keys) {
        if (out[key as keyof typeof out] === undefined) delete out[key as keyof typeof out];
      }
      return out;
    });
}

// ---------------------------------------------------------------- checks

/** The characters Yup's email pattern allows before the @ (WHATWG's set). */
const EMAIL_LOCAL = /^[\w.!#$%&'*+/=?^`{|}~-]+$/;
/** One DNS label: 1–63 alphanumerics or hyphens, never starting or ending with a hyphen. */
const DNS_LABEL = /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/;

/**
 * Yup's email rule, checked in parts instead of one regex: exactly one @, a
 * local part from the allowed set, and a domain made of valid labels.
 */
function isEmail(value: string): boolean {
  const at = value.indexOf('@');
  if (at < 1 || value.includes('@', at + 1)) return false;
  const labels = value.slice(at + 1).split('.');
  return EMAIL_LOCAL.test(value.slice(0, at)) && labels.every((label) => DNS_LABEL.test(label));
}

const URL_PROTOCOLS = new Set(['http:', 'https:', 'ftp:']);
const IPV4 = /^\d{1,3}(?:\.\d{1,3}){3}$/;

/**
 * A web address: http, https or ftp (or protocol-relative //host), with a dotted
 * host or an IPv4 address, and no whitespace. Replaces Yup's URL regex, whose
 * nested quantifiers could backtrack for seconds on a crafted 2 KB string.
 */
function isUrl(value: string): boolean {
  // Whitespace, or a % that does not start a two-digit hex escape.
  if (/\s|%(?![\da-f]{2})/i.test(value)) return false;
  const absolute = value.startsWith('//') ? 'https:' + value : value;
  let parsed: URL;
  try {
    parsed = new URL(absolute);
  } catch {
    return false;
  }
  if (!URL_PROTOCOLS.has(parsed.protocol)) return false;
  const host = parsed.hostname;
  if (IPV4.test(host)) return true;
  return host.includes('.') && host.split('.').every((label) => !label.startsWith('-') && !label.endsWith('-'));
}

const rule = <T>(test: (value: T) => boolean, message: string | undefined, fallback: Render) =>
  z.refine<T>(test, { error: message ?? named(fallback) });

/** Non-empty — the part of `required` that a string adds. */
export const filled = (message?: string) =>
  rule<string>((v) => v.length > 0, message, (p) => `${p} is a required field`);
export const minLen = (min: number, message?: string) =>
  rule<string>((v) => v.length >= min, message, (p) => `${p} must be at least ${min} characters`);
export const maxLen = (max: number, message?: string) =>
  rule<string>((v) => v.length <= max, message, (p) => `${p} must be at most ${max} characters`);

export interface MatchOptions {
  readonly message?: string;
  /** Let '' through — "blank clears the field". */
  readonly excludeEmptyString?: boolean;
}

export function matches(pattern: RegExp, options: string | MatchOptions = {}) {
  const { message, excludeEmptyString = false } = typeof options === 'string' ? { message: options } : options;
  return rule<string>(
    (v) => (v === '' && excludeEmptyString) || v.search(pattern) !== -1,
    message,
    (p) => `${p} must match the following: "${printValue(pattern)}"`
  );
}

export const email = (message?: string) =>
  rule<string>((v) => v === '' || isEmail(v), message, (p) => `${p} must be a valid email`);
export const url = (message?: string) =>
  rule<string>((v) => v === '' || isUrl(v), message, (p) => `${p} must be a valid URL`);

export const gte = (min: number, message?: string) =>
  rule<number>((v) => v >= min, message, (p) => `${p} must be greater than or equal to ${printNumber(min)}`);
export const lte = (max: number, message?: string) =>
  rule<number>((v) => v <= max, message, (p) => `${p} must be less than or equal to ${printNumber(max)}`);
export const gt = (more: number, message?: string) =>
  rule<number>((v) => v > more, message, (p) => `${p} must be greater than ${printNumber(more)}`);
export const int = (message?: string) =>
  rule<number>((v) => Number.isInteger(v), message, (p) => `${p} must be an integer`);

// A list's length is judged even when its items failed — the two are reported together.
const listRule = (test: (value: readonly unknown[]) => boolean, message: string | undefined, fallback: Render) =>
  z.refine<readonly unknown[]>(test, {
    error: message ?? named(fallback),
    when: (payload) => Array.isArray(payload.value),
  });

export const minItems = (min: number, message?: string) =>
  listRule((v) => v.length >= min, message, (p) => `${p} field must have at least ${min} items`);
export const maxItems = (max: number, message?: string) =>
  listRule((v) => v.length <= max, message, (p) => `${p} field must have less than or equal to ${max} items`);

export const notAfter = (limit: Date, message?: string) =>
  rule<Date>((v) => v <= limit, message, (p) => `${p} field must be at earlier than ${printValue(limit)}`);

// ---------------------------------------------------------------- reporting

/** Every message a failed parse produced, in the order they are reported. */
export const messagesOf = (error: z.ZodError): string[] => error.issues.map((issue) => issue.message);

/** One line for a failed parse: the message itself, or how many there were. */
export function summaryOf(error: z.ZodError): string {
  const messages = messagesOf(error);
  return messages.length > 1 ? `${messages.length} errors occurred` : messages[0];
}
