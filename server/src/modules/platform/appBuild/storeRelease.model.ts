import { Schema, model, type Document } from 'mongoose';

/**
 * What the stores said about our releases, and what we did about it.
 *
 * The release rows themselves are NOT stored — Tech → App Builds → Releases
 * reads App Store Connect and Google Play live every time it opens, so the
 * table can never be older than the stores. What IS kept is every moment a
 * release needed a person: a rejection, or an approved version waiting for
 * someone to press release. Those are the rows the mail, the Slack post, the
 * AI advice and the reminders hang off, and the ones the table shows beside
 * the store's own state so "why was 1.80.3 rejected" is answerable after Apple
 * has replaced that version with the next.
 */

export type ReleaseStore = 'APP_STORE' | 'GOOGLE_PLAY';

/** Why a release needs a person. */
export type ReleaseIssueKind = 'REJECTION' | 'AWAITING_RELEASE';

/**
 * STORE when the server read it off the store's API — Apple reports rejected
 * states; MANUAL when an operator logged it from the store's mail or console,
 * which is the only way for Google Play, whose API says nothing about review.
 */
export type ReleaseIssueSource = 'STORE' | 'MANUAL';

export interface IStoreReleaseAdvice {
  summary: string;
  causes: string[];
  steps: string[];
  next_time: string[];
  confidence: string;
  model: string;
  generated_at: Date | null;
  /** Why there is no advice, when OpenAI could not answer. */
  error: string;
}

export interface IStoreReleaseIssue extends Document {
  store: ReleaseStore;
  kind: ReleaseIssueKind;
  source: ReleaseIssueSource;
  version: string;
  build_number: string;
  /** The store's own word for it (METADATA_REJECTED, PENDING_DEVELOPER_RELEASE…) or MANUAL. */
  state: string;
  /** Apple's review-submission state at the time, when one was attached. */
  review_state: string;
  /**
   * What the reviewer wrote. Neither store's API carries this — Apple keeps it
   * in the Resolution Center, Google in the Play Console and its mail — so an
   * operator pastes it, and the advice is regenerated with it.
   */
  reviewer_message: string;
  /** Apple's version id / Play's release name — what the live row is matched on. */
  store_ref: string;
  /** One open issue per store+kind+version+build+state; the sync checks this before creating. */
  dedupe_key: string;
  detected_at: Date;
  /** Who logged it, for MANUAL. Empty when the store reported it. */
  detected_by: string;
  resolved_at: Date | null;
  resolved_reason: string;
  advice: IStoreReleaseAdvice;
  notified_at: Date | null;
  notify_error: string;
  reminder_count: number;
  last_reminded_at: Date | null;
  resubmitted_build_no: string;
  resubmitted_by: string;
  resubmitted_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

const text = { type: String, default: '', trim: true };
const strings = { type: [String], default: [] };

const adviceSchema = new Schema<IStoreReleaseAdvice>(
  {
    summary: { type: String, default: '' },
    causes: strings,
    steps: strings,
    next_time: strings,
    confidence: text,
    model: text,
    generated_at: { type: Date, default: null },
    error: { type: String, default: '' },
  },
  { _id: false }
);

const storeReleaseIssueSchema = new Schema<IStoreReleaseIssue>(
  {
    store: { type: String, enum: ['APP_STORE', 'GOOGLE_PLAY'], required: true, index: true },
    kind: { type: String, enum: ['REJECTION', 'AWAITING_RELEASE'], required: true },
    source: { type: String, enum: ['STORE', 'MANUAL'], required: true },
    version: text,
    build_number: text,
    state: text,
    review_state: text,
    reviewer_message: { type: String, default: '' },
    store_ref: text,
    dedupe_key: { type: String, required: true, index: true },
    detected_at: { type: Date, required: true },
    detected_by: text,
    resolved_at: { type: Date, default: null, index: true },
    resolved_reason: text,
    advice: { type: adviceSchema, default: () => ({}) },
    notified_at: { type: Date, default: null },
    notify_error: { type: String, default: '' },
    reminder_count: { type: Number, default: 0 },
    last_reminded_at: { type: Date, default: null },
    resubmitted_build_no: text,
    resubmitted_by: text,
    resubmitted_at: { type: Date, default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

// The Releases page reads a store's issues newest first.
storeReleaseIssueSchema.index({ store: 1, detected_at: -1 });

export const StoreReleaseIssueModel = model<IStoreReleaseIssue>('StoreReleaseIssue', storeReleaseIssueSchema);

/**
 * Where the notices go. One document, edited on Tech → App Builds → Settings.
 * `mail_to` starts with the platform's admin address so a rejection is never
 * silent before anyone has opened the settings.
 */
export interface IStoreReleaseSettings extends Document {
  singleton_key: string;
  notify_enabled: boolean;
  /** Slack channel ID. Empty means no Slack post. */
  slack_channel: string;
  mail_to: string[];
  reminders_enabled: boolean;
  /** How long an issue may stay open before it is raised again, and then again. */
  reminder_hours: number;
  updated_by: string;
  created_at: Date;
  updated_at: Date;
}

export const STORE_RELEASE_SETTINGS_KEY = 'store_release_settings';
/** The address every rejection notice starts out going to. */
export const DEFAULT_RELEASE_MAIL_TO = 'admin@duncit.com';
export const DEFAULT_REMINDER_HOURS = 24;
export const MIN_REMINDER_HOURS = 1;
export const MAX_REMINDER_HOURS = 168;

const storeReleaseSettingsSchema = new Schema<IStoreReleaseSettings>(
  {
    singleton_key: { type: String, required: true, unique: true, default: STORE_RELEASE_SETTINGS_KEY },
    notify_enabled: { type: Boolean, default: true },
    slack_channel: text,
    mail_to: { type: [String], default: () => [DEFAULT_RELEASE_MAIL_TO] },
    reminders_enabled: { type: Boolean, default: true },
    reminder_hours: { type: Number, default: DEFAULT_REMINDER_HOURS },
    updated_by: text,
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export const StoreReleaseSettingsModel = model<IStoreReleaseSettings>(
  'StoreReleaseSettings',
  storeReleaseSettingsSchema
);
