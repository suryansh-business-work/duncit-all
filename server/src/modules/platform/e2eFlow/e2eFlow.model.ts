import { Schema, model, type Document, type Types } from 'mongoose';

/** One step of a sub flow — what the person does, and what should happen. */
export interface IE2eFlowStep {
  action: string;
  expected: string;
}

/**
 * A tech admin's verdict on a sub flow's steps. Only LOOKS_GOOD journeys are
 * ready to be turned into e2e tests; NEEDS_REVIEW sends one back for another look.
 */
export const E2E_REVIEW_STATUSES = ['NOT_REVIEWED', 'NEEDS_REVIEW', 'LOOKS_GOOD'] as const;
export type E2eReviewStatus = (typeof E2E_REVIEW_STATUSES)[number];

/**
 * A journey inside a flow, e.g. "User Login" inside "User Authentication".
 * Embedded: a sub flow has no life outside its flow, and the flow page always
 * reads every one of them together.
 */
export interface IE2eSubFlow {
  _id: Types.ObjectId;
  name: string;
  description: string;
  steps: IE2eFlowStep[];
  review_status: E2eReviewStatus;
  reviewed_by: string;
  reviewed_at: Date | null;
}

/** A main flow the Tech team documents for the e2e suite, e.g. "User Authentication". */
export interface IE2eFlow extends Document {
  name: string;
  description: string;
  sub_flows: Types.DocumentArray<IE2eSubFlow & Document>;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

const stepSchema = new Schema<IE2eFlowStep>(
  {
    action: { type: String, required: true, trim: true },
    expected: { type: String, default: '', trim: true },
  },
  { _id: false }
);

const subFlowSchema = new Schema<IE2eSubFlow>({
  name: { type: String, required: true, trim: true },
  description: { type: String, default: '', trim: true },
  steps: { type: [stepSchema], default: [] },
  review_status: { type: String, enum: E2E_REVIEW_STATUSES, default: 'NOT_REVIEWED' },
  reviewed_by: { type: String, default: '' },
  reviewed_at: { type: Date, default: null },
});

const e2eFlowSchema = new Schema<IE2eFlow>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
    sub_flows: { type: [subFlowSchema], default: [] },
    created_by: { type: String, default: '' },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

e2eFlowSchema.index({ updated_at: -1 });

export const E2eFlowModel = model<IE2eFlow>('E2eFlow', e2eFlowSchema);
