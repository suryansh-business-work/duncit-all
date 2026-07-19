import { Schema, model, type Document } from 'mongoose';

/**
 * Shared atomic counter for the human-readable, permanent IDs assigned to
 * onboarded entities (Host → HOST-000001, Venue → VEN-000001, Brand →
 * BRD-000001). One counter document per entity key. Mirrors the
 * meeting/hostRequest counter pattern (rule 34 — one implementation).
 */
interface IEntityIdCounter extends Document {
  singleton_key: string;
  seq: number;
}

const entityIdCounterSchema = new Schema<IEntityIdCounter>({
  singleton_key: { type: String, required: true, unique: true },
  seq: { type: Number, default: 0 },
});

export const EntityIdCounterModel = model<IEntityIdCounter>('EntityIdCounter', entityIdCounterSchema);

/** Next sequential id for an entity, e.g. `nextEntityNo('HOST', 'host')` → `HOST-000001`. */
export async function nextEntityNo(prefix: string, key: string): Promise<string> {
  const doc = await EntityIdCounterModel.findOneAndUpdate(
    { singleton_key: `entity_no_${key}` },
    { $inc: { seq: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );
  return `${prefix}-${String(doc.seq).padStart(6, '0')}`;
}
