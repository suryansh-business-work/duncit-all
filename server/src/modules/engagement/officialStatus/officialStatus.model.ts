import { Schema, model, InferSchemaType, type Types } from 'mongoose';

/** Everybody, or only the viewers browsing one of `location_ids`. */
export const OFFICIAL_STATUS_SCOPES = ['GLOBAL', 'LOCATION'] as const;
export type OfficialStatusScope = (typeof OFFICIAL_STATUS_SCOPES)[number];

/** What the marketer picked in the form. Stored as `expires_at`, never as itself. */
export const OFFICIAL_STATUS_EXPIRIES = ['HOURS_24', 'NEVER', 'CUSTOM'] as const;
export type OfficialStatusExpiry = (typeof OFFICIAL_STATUS_EXPIRIES)[number];

/** The two things a slide can be — the same pair as CategoryMediaType. */
export const OFFICIAL_STATUS_MEDIA_TYPES = ['IMAGE', 'VIDEO'] as const;
export type OfficialStatusMediaType = (typeof OFFICIAL_STATUS_MEDIA_TYPES)[number];

/**
 * A status Duncit itself publishes — the pinned tile at the head of the apps'
 * status rail.
 *
 * `expires_at` and `is_active` are evaluated at READ time, exactly like
 * appPopup's window: a status drops out of the rail the moment it expires
 * without anything running on a schedule. A TTL index would be wrong here —
 * the marketing table is where an expired status is reviewed and switched back
 * on, and a swept document cannot be re-activated because it no longer exists.
 *
 * `expires_at: null` means it never expires, which is why that is a nullable
 * Date rather than a far-future one: "never" is an answer the marketer gave,
 * not a date to compare against.
 */
const officialStatusSchema = new Schema(
  {
    /** Internal label — what the marketing table shows. Never rendered in-app. */
    title: { type: String, required: true, trim: true, maxlength: 120 },
    media_url: { type: String, required: true, trim: true },
    media_type: { type: String, enum: OFFICIAL_STATUS_MEDIA_TYPES, default: 'IMAGE' },
    /** Drawn over the slide; '' when there is none. */
    caption: { type: String, default: '', trim: true, maxlength: 300 },
    /** In-app path ('/pod-ideas') or an https address; '' leaves the slide untappable. */
    link_url: { type: String, default: '', trim: true, maxlength: 600 },
    scope: { type: String, enum: OFFICIAL_STATUS_SCOPES, default: 'GLOBAL' },
    /** The cities a LOCATION status is published to, matched against the city
     * the viewer SELECTED in the app — never their profile city. Always empty
     * for GLOBAL, so switching scope back can never leave a stale audience. */
    location_ids: [{ type: Schema.Types.ObjectId, ref: 'Location' }],
    expires_at: { type: Date, default: null },
    is_active: { type: Boolean, default: true },
    created_by: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

// The rail read filters on the switch and the expiry together, newest first.
officialStatusSchema.index({ is_active: 1, expires_at: 1, created_at: -1 });
// ...and narrows a city-wide status by the selected city.
officialStatusSchema.index({ scope: 1, location_ids: 1 });
officialStatusSchema.index({ created_at: -1 });

export type OfficialStatusDoc = InferSchemaType<typeof officialStatusSchema> & {
  _id: Types.ObjectId;
};
export const OfficialStatusModel = model('OfficialStatus', officialStatusSchema);

/**
 * One row per person per status, written the first time they watch the slide.
 *
 * It is what the unseen ring reads, and what `view_count` counts. Keyed on the
 * user rather than the device so watching on a second phone does not re-light
 * a ring somebody already cleared; the unique index makes the write idempotent,
 * so a rail that records the same slide twice writes one row.
 */
const officialStatusSeenSchema = new Schema(
  {
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status_doc_id: { type: Schema.Types.ObjectId, ref: 'OfficialStatus', required: true },
  },
  { timestamps: { createdAt: 'seen_at', updatedAt: false } }
);

officialStatusSeenSchema.index({ user_id: 1, status_doc_id: 1 }, { unique: true });
// view_count counts one status' rows; without this it would scan the collection.
officialStatusSeenSchema.index({ status_doc_id: 1 });

export const OfficialStatusSeenModel = model('OfficialStatusSeen', officialStatusSeenSchema);
