import mongoose, { Schema, type Types } from 'mongoose';
import { actorSchema, type IHrActor } from './employee.model';
import { HR_EVENT_KINDS, type HrEventKind } from './employee.rules';

/** One field that moved: labels and values as text, never a secret. */
export interface IHrFieldChange {
  field: string;
  from: string | null;
  to: string | null;
}

export interface IHrEmployeeEvent {
  _id: Types.ObjectId;
  employee_id: Types.ObjectId;
  kind: HrEventKind;
  /** `YYYY-MM-DD` the change takes effect, which may differ from when it was recorded. */
  effective_date: string;
  changes: IHrFieldChange[];
  note: string | null;
  actor: IHrActor;
  created_at: Date;
}

const changeSchema = new Schema<IHrFieldChange>(
  {
    field: { type: String, required: true },
    from: { type: String, default: null },
    to: { type: String, default: null },
  },
  { _id: false }
);

/**
 * The worker history: hire, every job and pay change, exits, rehires and each
 * reveal of the bank details. Append-only — nothing updates or deletes a row —
 * so it doubles as the audit trail for the record.
 */
const eventSchema = new Schema<IHrEmployeeEvent>(
  {
    employee_id: { type: Schema.Types.ObjectId, ref: 'HrEmployee', required: true },
    kind: { type: String, enum: HR_EVENT_KINDS, required: true },
    effective_date: { type: String, required: true },
    changes: { type: [changeSchema], default: [] },
    note: { type: String, default: null },
    actor: { type: actorSchema, required: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false }, collection: 'hr_employee_events' }
);

eventSchema.index({ employee_id: 1, created_at: -1 });

export const HrEmployeeEventModel =
  (mongoose.models.HrEmployeeEvent as mongoose.Model<IHrEmployeeEvent>) ||
  mongoose.model<IHrEmployeeEvent>('HrEmployeeEvent', eventSchema);
