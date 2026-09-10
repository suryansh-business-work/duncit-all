/**
 * Reading and rendering one tracked field of a stored document.
 *
 * Both change-log trails use this: the user trail (`userAudit`) and the entity
 * trail (`entityAudit`) that covers venues, hosts, clubs, club admins and
 * regions. They differ in what they watch and where they store it; how a value
 * becomes the single string a log row holds is the same problem, so it is
 * solved once here rather than once per trail (rule 34).
 */

/** One watched field: where it lives, and what a report calls it. */
export interface DiffField {
  /** Document dot-path, e.g. `settings.rules.buffer_minutes`. */
  path: string;
  /** Human label for the same field, e.g. `Booking buffer (minutes)`. */
  label: string;
  /** Array order carries meaning, so re-ordering is a real change. */
  ordered?: boolean;
}

/** Walk a dot-path on a document (hydrated or lean). */
export function readPath(doc: unknown, path: string): unknown {
  return path
    .split('.')
    .reduce<unknown>(
      (acc, key) => (acc == null ? undefined : (acc as Record<string, unknown>)[key]),
      doc
    );
}

/** The stored shapes that are not plain scalars: an ObjectId, a profile link. */
interface ValueShape {
  label?: unknown;
  url?: unknown;
  toHexString?: () => string;
}

/** True for the values that are safe to hand straight to `String()`. */
function isScalar(value: unknown): value is string | number | boolean | bigint {
  const kind = typeof value;
  return kind === 'string' || kind === 'number' || kind === 'boolean' || kind === 'bigint';
}

/** One value as text. A profile link reads as its label + url, an id as hex. */
function itemText(item: unknown): string {
  if (isScalar(item)) return String(item);
  if (item instanceof Date) return item.toISOString();
  if (item === null || typeof item !== 'object') return '';
  const shape = item as ValueShape;
  if (typeof shape.toHexString === 'function') return shape.toHexString();
  if (typeof shape.url === 'string') {
    const label = typeof shape.label === 'string' ? shape.label : '';
    return `${label} (${shape.url})`;
  }
  // Anything else object-shaped would render as [object Object] (S6551).
  return JSON.stringify(item);
}

/**
 * A field value as the single string the log stores and the table renders.
 *
 * Unordered arrays (roles, amenities) are sorted first: the same set arriving
 * in a different order is not a change, and reporting it as one would fill the
 * trail with edits nobody made.
 */
export function valueText(value: unknown, field: Pick<DiffField, 'ordered'>): string {
  if (value === null || value === undefined || value === '') return '';
  if (Array.isArray(value)) {
    // `items` is already a fresh array off `.map`, so sorting it in place
    // mutates nothing the caller can see.
    const items: string[] = value.map(itemText).filter(Boolean);
    if (!field.ordered) items.sort((a, b) => a.localeCompare(b));
    return items.join(', ');
  }
  return itemText(value);
}

/** A path -> rendered value snapshot of one document's tracked fields. */
export type DocSnapshot = Record<string, string>;

export function snapshotDoc(doc: unknown, fields: readonly DiffField[]): DocSnapshot {
  const snap: DocSnapshot = {};
  for (const field of fields) {
    snap[field.path] = valueText(readPath(doc, field.path), field);
  }
  return snap;
}

/** One field that moved between two snapshots. */
export interface FieldChange {
  field: string;
  field_label: string;
  old_value: string;
  new_value: string;
}

/** Field-level diff of two snapshots — empty when nothing tracked moved. */
export function diffSnapshots(
  before: DocSnapshot,
  after: DocSnapshot,
  fields: readonly DiffField[]
): FieldChange[] {
  const changes: FieldChange[] = [];
  for (const field of fields) {
    const oldValue = before[field.path] ?? '';
    const newValue = after[field.path] ?? '';
    if (oldValue !== newValue) {
      changes.push({
        field: field.path,
        field_label: field.label,
        old_value: oldValue,
        new_value: newValue,
      });
    }
  }
  return changes;
}
