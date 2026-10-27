import mongoose, { Schema, type Document } from 'mongoose';

export const NODE_KINDS = ['HEAD', 'DEPARTMENT', 'ROLE', 'AI_AGENT'] as const;
export type NodeKind = (typeof NODE_KINDS)[number];

export const EMPLOYMENT_TYPES = ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'ADVISOR', 'AI_AGENT'] as const;
export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number];

export const NODE_STATUSES = ['FILLED', 'VACANT', 'OPTIONAL'] as const;
export type NodeStatus = (typeof NODE_STATUSES)[number];

/** FIXED pays `amount`; VARIABLE pays between `min_amount` and `max_amount`, `amount` being the expected figure. */
export const PAY_KINDS = ['FIXED', 'VARIABLE'] as const;
export type PayKind = (typeof PAY_KINDS)[number];

export const PAY_FREQUENCIES = ['MONTHLY', 'ANNUAL', 'PER_UNIT'] as const;
export type PayFrequency = (typeof PAY_FREQUENCIES)[number];

/** One line of a seat's pay: base salary, an incentive, a commission, a stipend... */
export interface IPayComponent {
  label: string;
  kind: PayKind;
  frequency: PayFrequency;
  amount: number;
  min_amount?: number | null;
  max_amount?: number | null;
  note?: string | null;
}

export interface ITeamStructure extends Document {
  name: string;
  description?: string | null;
  currency: string;
  created_at: Date;
  updated_at: Date;
}

/**
 * One seat on the chart. The chart is the parent_id tree; a seat may be vacant,
 * an AI agent, or linked to a real user. Salary lives on the seat, not the user,
 * because a vacant seat still has a budget.
 */
export interface ITeamStructureNode extends Document {
  structure_id: mongoose.Types.ObjectId;
  parent_id: mongoose.Types.ObjectId | null;
  kind: NodeKind;
  title: string;
  person_name?: string | null;
  user_id?: mongoose.Types.ObjectId | null;
  department?: string | null;
  employment_type: EmploymentType;
  status: NodeStatus;
  notes?: string | null;
  sort_order: number;
  pay: IPayComponent[];
  created_at: Date;
  updated_at: Date;
}

/** A revocable link that shows the chart without sign-in. `show_*` decide what leaves HR. */
export interface ITeamStructureShare extends Document {
  structure_id: mongoose.Types.ObjectId;
  token: string;
  label?: string | null;
  show_salary: boolean;
  expires_at?: Date | null;
  revoked_at?: Date | null;
  created_at: Date;
  updated_at: Date;
}

const timestamps = { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } };

const payComponentSchema = new Schema<IPayComponent>(
  {
    label: { type: String, required: true, trim: true, maxlength: 80 },
    kind: { type: String, enum: PAY_KINDS, required: true },
    frequency: { type: String, enum: PAY_FREQUENCIES, required: true },
    amount: { type: Number, required: true, min: 0 },
    min_amount: { type: Number, min: 0, default: null },
    max_amount: { type: Number, min: 0, default: null },
    note: { type: String, trim: true, maxlength: 240, default: null },
  },
  { _id: false }
);

const structureSchema = new Schema<ITeamStructure>(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, trim: true, maxlength: 500, default: null },
    currency: { type: String, required: true, trim: true, uppercase: true, default: 'INR' },
  },
  timestamps
);

const nodeSchema = new Schema<ITeamStructureNode>(
  {
    structure_id: { type: Schema.Types.ObjectId, ref: 'TeamStructure', required: true, index: true },
    parent_id: { type: Schema.Types.ObjectId, ref: 'TeamStructureNode', default: null },
    kind: { type: String, enum: NODE_KINDS, required: true },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    person_name: { type: String, trim: true, maxlength: 120, default: null },
    user_id: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    department: { type: String, trim: true, maxlength: 80, default: null },
    employment_type: { type: String, enum: EMPLOYMENT_TYPES, required: true },
    status: { type: String, enum: NODE_STATUSES, default: 'FILLED' },
    notes: { type: String, trim: true, maxlength: 500, default: null },
    sort_order: { type: Number, default: 0 },
    pay: { type: [payComponentSchema], default: [] },
  },
  timestamps
);
nodeSchema.index({ structure_id: 1, parent_id: 1, sort_order: 1 });

const shareSchema = new Schema<ITeamStructureShare>(
  {
    structure_id: { type: Schema.Types.ObjectId, ref: 'TeamStructure', required: true, index: true },
    token: { type: String, required: true, unique: true },
    label: { type: String, trim: true, maxlength: 80, default: null },
    show_salary: { type: Boolean, default: false },
    expires_at: { type: Date, default: null },
    revoked_at: { type: Date, default: null },
  },
  timestamps
);

export const TeamStructureModel =
  (mongoose.models.TeamStructure as mongoose.Model<ITeamStructure>) ||
  mongoose.model<ITeamStructure>('TeamStructure', structureSchema);
export const TeamStructureNodeModel =
  (mongoose.models.TeamStructureNode as mongoose.Model<ITeamStructureNode>) ||
  mongoose.model<ITeamStructureNode>('TeamStructureNode', nodeSchema);
export const TeamStructureShareModel =
  (mongoose.models.TeamStructureShare as mongoose.Model<ITeamStructureShare>) ||
  mongoose.model<ITeamStructureShare>('TeamStructureShare', shareSchema);
