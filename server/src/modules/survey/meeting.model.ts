import { Schema, model, InferSchemaType, Types } from 'mongoose';
import { SURVEY_KINDS } from './survey.model';

/**
 * Onboarding meeting request — raised by a user right after the venue/host
 * onboarding survey, then scheduled/tracked by onboarding staff (calendar +
 * tables in the Onboarding portal). One open meeting per user per kind.
 */
export const MEETING_STATUSES = ['REQUESTED', 'SCHEDULED', 'DONE', 'CANCELLED'] as const;
export type MeetingStatus = (typeof MEETING_STATUSES)[number];

const meetingSchema = new Schema(
  {
    kind: { type: String, enum: SURVEY_KINDS, required: true, index: true },
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    /** When the user is available / proposed. */
    requested_at: { type: Date, required: true },
    /** When onboarding actually scheduled it (set by staff). */
    scheduled_at: { type: Date, default: null, index: true },
    /** Video-call / meeting URL added by onboarding staff when scheduling. */
    meeting_link: { type: String, default: null },
    status: { type: String, enum: MEETING_STATUSES, default: 'REQUESTED', index: true },
    notes: { type: String, default: null },
    contact_name: { type: String, default: null },
    contact_phone: { type: String, default: null },
    created_by: { type: String, default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

// One open request per user/kind — re-requesting updates the same row.
meetingSchema.index({ user_id: 1, kind: 1 }, { unique: true });

export type MeetingDoc = InferSchemaType<typeof meetingSchema> & { _id: Types.ObjectId };
export const MeetingModel = model('OnboardingMeeting', meetingSchema);
