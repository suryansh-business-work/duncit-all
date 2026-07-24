import { Schema, model, InferSchemaType, Types } from 'mongoose';

/**
 * Generic admin approval request. Any portal can raise a request that the
 * Admin console reviews from the "Approve/Deny Requests" inbox. The `type`
 * discriminates the use-case; `details` is a portal-agnostic list of
 * label → value rows the inbox renders, so new request types need no schema
 * change. Current use-case: ecomm brand/product change requests from the
 * Products portal. (Onboarding meetings are decided in the Onboarding console
 * itself, not through this inbox.)
 */
export const APPROVAL_TYPES = [
  'ECOMM_BRAND_CHANGE',
  'ECOMM_PRODUCT_CHANGE',
  'WAREHOUSE_APPROVAL',
] as const;
export type ApprovalType = (typeof APPROVAL_TYPES)[number];

export const APPROVAL_STATUSES = ['PENDING', 'APPROVED', 'DENIED'] as const;
export type ApprovalStatus = (typeof APPROVAL_STATUSES)[number];

const detailSchema = new Schema(
  {
    label: { type: String, required: true },
    value: { type: String, default: '' },
  },
  { _id: false },
);

const approvalRequestSchema = new Schema(
  {
    type: { type: String, enum: APPROVAL_TYPES, required: true, index: true },
    status: { type: String, enum: APPROVAL_STATUSES, default: 'PENDING', index: true },
    /** Which portal raised it (e.g. 'onboarding'). */
    source_portal: { type: String, default: '' },
    title: { type: String, default: '' },
    summary: { type: String, default: '' },
    /** Portal-agnostic rows the admin inbox renders (survey answers, feedback…). */
    details: { type: [detailSchema], default: [] },
    /** Ecomm change-requests: target brand/product id + JSON payload of the
     * proposed field changes, applied to the entity on approval (Task B item 2). */
    target_id: { type: String, default: null },
    payload: { type: String, default: null },
    /** Optional structured links for the onboarding-meeting use-case. */
    kind: { type: String, default: null },
    subject_user_id: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    subject_name: { type: String, default: null },
    subject_email: { type: String, default: null },
    subject_phone: { type: String, default: null },
    meeting_id: { type: Schema.Types.ObjectId, ref: 'OnboardingMeeting', default: null, index: true },
    requested_by: { type: String, default: null },
    requested_by_name: { type: String, default: null },
    reviewed_by: { type: String, default: null },
    reviewed_by_name: { type: String, default: null },
    reviewed_at: { type: Date, default: null },
    review_notes: { type: String, default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } },
);

export type ApprovalRequestDoc = InferSchemaType<typeof approvalRequestSchema> & { _id: Types.ObjectId };
export const ApprovalRequestModel = model('ApprovalRequest', approvalRequestSchema);
