import type { Model, Query, Schema } from 'mongoose';
import { logs } from '@observability/log';
import { ENTITY_AUDIT_CONFIG } from './entityAudit.fields';
import { entityAuditService } from './entityAudit.service';
import type { EntityAuditType } from './entityAudit.model';

/**
 * Where a directory entity's change log is captured: on the MODEL, not in the
 * services.
 *
 * A venue is written from eleven places — three onboarding steps, the owner's
 * own edit, the admin editor, approve, reject, the deductions form, the
 * settings form, the active switch and the auto-cancel sweep — and a host, a
 * club, a club admin and a region each have their own handful. Asking every one
 * of them to remember to log is how a trail ends up with holes in exactly the
 * paths nobody thought about, which is the failure the user change log already
 * had to go back and patch twice (`auth-whatsapp`, `finance.resolver`).
 *
 * So the seam is one `attachEntityAudit(schema, type)` per model. Every write
 * through mongoose — a `save()`, a `findOneAndUpdate`, an `updateOne`, a delete
 * — is diffed against what was stored a moment earlier, and a write that moved
 * no tracked field costs one skipped hook and nothing else.
 */

/** Stashed between the pre- and post- halves of one write. */
interface AuditLocals {
  entityAuditBefore?: unknown;
  entityAuditSkip?: boolean;
}

type AuditQuery = Query<unknown, unknown> & AuditLocals;

/** True when a modified path is (or is inside, or contains) a tracked field. */
function isTracked(entityType: EntityAuditType, path: string): boolean {
  return ENTITY_AUDIT_CONFIG[entityType].fields.some(
    (field) =>
      field.path === path ||
      field.path.startsWith(`${path}.`) ||
      path.startsWith(`${field.path}.`)
  );
}

const touchesTracked = (entityType: EntityAuditType, paths: readonly string[]): boolean =>
  paths.some((path) => isTracked(entityType, path));

/** Every field path an update payload names, across its operators. */
function updatePaths(update: unknown): string[] {
  if (!update || typeof update !== 'object') return [];
  const paths: string[] = [];
  for (const [key, value] of Object.entries(update as Record<string, unknown>)) {
    if (!key.startsWith('$')) {
      paths.push(key);
      continue;
    }
    if (value && typeof value === 'object') paths.push(...Object.keys(value));
  }
  return paths;
}

/** Fire-and-forget: a change log must never fail the edit that caused it. */
function logChange(
  entityType: EntityAuditType,
  entityId: string,
  before: unknown,
  after: unknown,
  action: 'CREATE' | 'UPDATE' | 'DELETE'
): void {
  entityAuditService
    .record({ entityType, entityId, before, after, action })
    .catch((err) => logs.server.error('entityAudit', 'attach', { error: err, entityType }));
}

/** The document middleware — `new Model()` + `save()`, the common editor path. */
function attachDocumentHooks(schema: Schema, entityType: EntityAuditType): void {
  schema.pre('save', async function captureBefore() {
    const doc = this as unknown as AuditLocals & {
      isNew: boolean;
      _id: unknown;
      modifiedPaths: () => string[];
      constructor: Model<unknown>;
      $locals: AuditLocals;
    };
    doc.$locals.entityAuditSkip = false;
    if (doc.isNew) {
      doc.$locals.entityAuditBefore = null;
      return;
    }
    if (!touchesTracked(entityType, doc.modifiedPaths())) {
      doc.$locals.entityAuditSkip = true;
      return;
    }
    doc.$locals.entityAuditBefore = await doc.constructor.findById(doc._id).lean();
  });

  schema.post('save', function writeAfter(saved: unknown) {
    const doc = saved as { _id: unknown; $locals: AuditLocals };
    if (doc.$locals.entityAuditSkip) return;
    const before = doc.$locals.entityAuditBefore ?? null;
    logChange(entityType, String(doc._id), before, doc, before ? 'UPDATE' : 'CREATE');
  });
}

/** The query middleware — `findOneAndUpdate` / `updateOne` from a service. */
function attachUpdateHooks(schema: Schema, entityType: EntityAuditType): void {
  for (const op of ['findOneAndUpdate', 'updateOne'] as const) {
    schema.pre(op, async function captureBefore(this: AuditQuery) {
      if (!touchesTracked(entityType, updatePaths(this.getUpdate()))) {
        this.entityAuditSkip = true;
        return;
      }
      this.entityAuditBefore = await this.model.findOne(this.getFilter()).lean();
    });

    schema.post(op, async function writeAfter(this: AuditQuery) {
      if (this.entityAuditSkip) return;
      const before = this.entityAuditBefore as { _id?: unknown } | null;
      if (!before?._id) return;
      const after = await this.model.findById(before._id).lean();
      logChange(entityType, String(before._id), before, after, 'UPDATE');
    });
  }
}

/** The delete middleware — the record's last entry says what it held. */
function attachDeleteHooks(schema: Schema, entityType: EntityAuditType): void {
  for (const op of ['findOneAndDelete', 'deleteOne'] as const) {
    schema.pre(op, async function captureBefore(this: AuditQuery) {
      this.entityAuditBefore = await this.model.findOne(this.getFilter()).lean();
    });

    schema.post(op, function writeAfter(this: AuditQuery) {
      const before = this.entityAuditBefore as { _id?: unknown } | null;
      if (!before?._id) return;
      logChange(entityType, String(before._id), before, null, 'DELETE');
    });
  }
}

/** Give one entity's model its change log. Call it beside `model(...)`. */
export function attachEntityAudit(schema: Schema, entityType: EntityAuditType): void {
  attachDocumentHooks(schema, entityType);
  attachUpdateHooks(schema, entityType);
  attachDeleteHooks(schema, entityType);
}
