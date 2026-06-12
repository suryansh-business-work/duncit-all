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

/**
 * Global onboarding-meeting availability — a single document edited from the
 * Onboarding portal. Drives which bookable slots the gate's meeting step
 * offers. Times are wall-clock 'HH:mm' at the configured fixed UTC offset
 * (default IST, +330 minutes).
 */
const meetingAvailabilitySchema = new Schema(
  {
    /** Working days, JS getDay() numbering: 0=Sun … 6=Sat. */
    week_days: { type: [Number], default: [1, 2, 3, 4, 5, 6] },
    start_time: { type: String, default: '10:00' },
    end_time: { type: String, default: '19:00' },
    slot_minutes: { type: Number, default: 30 },
    /** How many days ahead users can book. */
    horizon_days: { type: Number, default: 7 },
    timezone_offset_minutes: { type: Number, default: 330 },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export type MeetingAvailabilityDoc = InferSchemaType<typeof meetingAvailabilitySchema> & {
  _id: Types.ObjectId;
};
export const MeetingAvailabilityModel = model('MeetingAvailability', meetingAvailabilitySchema);
