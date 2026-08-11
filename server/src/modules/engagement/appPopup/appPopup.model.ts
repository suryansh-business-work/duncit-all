import { Schema, model, InferSchemaType, type Types } from 'mongoose';

/** Which app builds a popup is aimed at. BOTH reaches every client. */
export const APP_POPUP_PLATFORMS = ['IOS', 'ANDROID', 'BOTH'] as const;
export type AppPopupPlatform = (typeof APP_POPUP_PLATFORMS)[number];

/** What a client reports about itself when it asks for a popup. */
export const APP_POPUP_CLIENT_PLATFORMS = ['IOS', 'ANDROID', 'WEB'] as const;
export type AppPopupClientPlatform = (typeof APP_POPUP_CLIENT_PLATFORMS)[number];

/** Everyone, or the people currently matching a saved marketing audience list. */
export const APP_POPUP_AUDIENCES = ['ALL_USERS', 'AUDIENCE_LIST'] as const;
export type AppPopupAudience = (typeof APP_POPUP_AUDIENCES)[number];

/**
 * A full-screen image shown once, when the app opens.
 *
 * The window (`start_at`/`end_at`) and `enabled` are evaluated at read time, so
 * a campaign starts and stops on its own without anything running on a
 * schedule. `audience_list_id` stores the LIST, never its members: the list is
 * a live segment, so somebody who matches tomorrow gets the popup tomorrow.
 */
const appPopupSchema = new Schema(
  {
    /** Internal label — what the marketing table shows. Never rendered in-app. */
    name: { type: String, required: true, trim: true, maxlength: 120 },
    image_url: { type: String, required: true, trim: true },
    start_at: { type: Date, required: true },
    end_at: { type: Date, required: true },
    enabled: { type: Boolean, default: true },
    platform: { type: String, enum: APP_POPUP_PLATFORMS, default: 'BOTH' },
    /** Whether the ✕ is drawn. Tapping outside the image always closes it, so
     * turning this off makes the popup harder to dismiss, never inescapable. */
    close_button_enabled: { type: Boolean, default: true },
    /** Optional call to action. Both are set together or the button is absent. */
    cta_label: { type: String, default: '', trim: true, maxlength: 60 },
    cta_url: { type: String, default: '', trim: true, maxlength: 500 },
    audience_type: { type: String, enum: APP_POPUP_AUDIENCES, default: 'ALL_USERS' },
    audience_list_id: { type: Schema.Types.ObjectId, ref: 'AudienceList', default: null },
    created_by: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

// The app-open read filters on the window and the switch together.
appPopupSchema.index({ enabled: 1, start_at: 1, end_at: 1 });
appPopupSchema.index({ created_at: -1 });

export type AppPopupDoc = InferSchemaType<typeof appPopupSchema> & { _id: Types.ObjectId };
export const AppPopupModel = model('AppPopup', appPopupSchema);

/**
 * One row per person per popup, written when they close it.
 *
 * This is what makes a popup show ONCE and never again. It is keyed on the
 * user rather than the device on purpose — signing in on a second phone must
 * not replay a popup somebody already dismissed. The unique index is the
 * guarantee: a double-tap on the ✕ writes the same row twice and the second
 * write is a no-op rather than a duplicate.
 */
const appPopupSeenSchema = new Schema(
  {
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    popup_id: { type: Schema.Types.ObjectId, ref: 'AppPopup', required: true },
  },
  { timestamps: { createdAt: 'seen_at', updatedAt: false } }
);

appPopupSeenSchema.index({ user_id: 1, popup_id: 1 }, { unique: true });

export const AppPopupSeenModel = model('AppPopupSeen', appPopupSeenSchema);
