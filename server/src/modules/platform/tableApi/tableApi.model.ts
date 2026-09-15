import { Schema, model, Types, type Document } from 'mongoose';

/**
 * A staff member's personal token for the table GET API (`/table-api/<table>`).
 *
 * One per person. A request carrying it runs as its owner, with the roles the
 * owner holds at request time — so a URL built from it returns exactly the rows
 * that person can already open in a portal, and nothing more. The raw token is
 * kept (not a hash) because every table's "GET API" dialog hands the owner a
 * ready-to-use URL; it is readable only by its owner and rotatable in one click.
 */
export interface ITableApiToken extends Document {
  user_id: Types.ObjectId;
  token: string;
  last_used_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

const tableApiTokenSchema = new Schema<ITableApiToken>(
  {
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    token: { type: String, required: true, unique: true },
    last_used_at: { type: Date, default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export const TableApiTokenModel = model<ITableApiToken>('TableApiToken', tableApiTokenSchema);
