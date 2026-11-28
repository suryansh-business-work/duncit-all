import type { Schema } from 'mongoose';

/** Every Mongoose write that could change or remove a stored row. */
const WRITE_OPERATIONS = [
  'updateOne',
  'updateMany',
  'findOneAndUpdate',
  'findOneAndReplace',
  'replaceOne',
  'deleteOne',
  'deleteMany',
  'findOneAndDelete',
] as const;

/**
 * Make a collection append-only where the data lives, rather than trusting
 * every caller: a row can be created, never saved again, updated or deleted.
 * An audit trail any code path can rewrite is not one.
 */
export function makeAppendOnly<T>(schema: Schema<T>, message: string): void {
  schema.pre('save', function (next) {
    next(this.isNew ? undefined : new Error(message));
  });
  for (const operation of WRITE_OPERATIONS) {
    schema.pre(operation, function (next) {
      next(new Error(message));
    });
  }
}
