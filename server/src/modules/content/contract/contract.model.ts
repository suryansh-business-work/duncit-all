import mongoose, { Schema, Types, type Document } from 'mongoose';
import { nextEntityNo } from '@modules/venues/entityIdCounter';

/** Where a contract is in its life. Draft until it is in force; archived at the end. */
export type ContractStatus = 'DRAFT' | 'ACTIVE' | 'EXPIRED' | 'ARCHIVED';
export const CONTRACT_STATUSES: ContractStatus[] = ['DRAFT', 'ACTIVE', 'EXPIRED', 'ARCHIVED'];

export interface IContract extends Document {
  /**
   * The permanent handle: CTR-000001.
   *
   * Minted from a counter that only ever counts up, so a deleted contract's id
   * is never handed to another one — an id that comes back around makes every
   * older reference to it a lie.
   */
  contract_no: string | null;
  title: string;
  description: string;
  content: string;
  status: ContractStatus;
  /** Who it is with. Free text — a counter-party is rarely a Duncit account. */
  counterparty: string;
  effective_from: Date | null;
  effective_to: Date | null;
  created_by: Types.ObjectId | null;
  updated_by: Types.ObjectId | null;
  created_at: Date;
  updated_at: Date;
}

const contractSchema = new Schema<IContract>(
  {
    contract_no: { type: String, default: null, unique: true, sparse: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 200, index: true },
    description: { type: String, default: '', trim: true, maxlength: 2000 },
    content: { type: String, default: '' },
    status: { type: String, enum: CONTRACT_STATUSES, default: 'DRAFT', index: true },
    counterparty: { type: String, default: '', trim: true, maxlength: 200 },
    effective_from: { type: Date, default: null },
    effective_to: { type: Date, default: null },
    created_by: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    updated_by: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

contractSchema.index({ status: 1, updated_at: -1 });

// Minted on insert only, so an id never changes once anyone has seen it — the
// same contract host_no / venue_no / club_admin_no carry.
contractSchema.pre('save', async function (next) {
  if (this.isNew && !this.contract_no) {
    this.contract_no = await nextEntityNo('CTR', 'contract');
  }
  next();
});

export const ContractModel =
  (mongoose.models.Contract as mongoose.Model<IContract>) ||
  mongoose.model<IContract>('Contract', contractSchema);
