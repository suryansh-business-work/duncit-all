import { Schema, model, type Document, Types } from 'mongoose';

/**
 * The coarse kind the first clickstream recorded. Named events (`app_open`,
 * `search_performed`, …) that are neither a view nor a click are EVENT; the
 * `event_name` says which.
 */
export type AppEventType = 'PAGE_VIEW' | 'IMPRESSION' | 'CLICK' | 'TOUCH' | 'EVENT';

export const APP_EVENT_TYPES: readonly AppEventType[] = ['PAGE_VIEW', 'IMPRESSION', 'CLICK', 'TOUCH', 'EVENT'];

/** Where the app was running: the native app on iOS or Android, its web build, or mWeb. */
export type AppEventPlatform = 'ios' | 'android' | 'web' | 'mweb' | '';

export const APP_EVENT_PLATFORMS: readonly AppEventPlatform[] = ['ios', 'android', 'web', 'mweb', ''];

export interface IAppEvent extends Document {
  /** The signed-in member; null for a visitor who has not signed in (yet) — the device id stands in. */
  user_id: Types.ObjectId | null;
  device_id: string;
  event_type: AppEventType;
  /** The snake_case taxonomy name (`screen_view`, `element_click`, `app_open`). '' on rows from before it existed. */
  event_name: string;
  client_event_id: string;
  /** The app session the event belongs to — a new one after 30 minutes without activity. */
  session_id: string;
  platform: AppEventPlatform;
  app_version: string;
  os_version: string;
  device_type: string;
  /** The screen the event happened on: a native route name, or an mWeb path with its ids replaced by `:id`. */
  screen_name: string;
  /** On a `screen_view`, the screen the member came from. */
  previous_screen: string;
  path: string;
  route: string;
  title: string;
  element_id: string;
  element_type: string;
  target_tag: string;
  target_text: string;
  target_label: string;
  target_role: string;
  target_href: string;
  /**
   * Foreground time, in ms, this event closes: on a `screen_view` the time spent
   * on `previous_screen`, on an `app_background` the time spent on `screen_name`.
   */
  duration_ms: number | null;
  super_category_slug: string | null;
  pod_id: Types.ObjectId | null;
  checkout_url: string;
  metadata: Record<string, unknown>;
  occurred_at: Date;
  created_at: Date;
  updated_at: Date;
}

const text = { type: String, default: '', trim: true };

const appEventSchema = new Schema<IAppEvent>(
  {
    user_id: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    device_id: { type: String, required: true, trim: true, index: true },
    event_type: { type: String, enum: APP_EVENT_TYPES, required: true, index: true },
    event_name: text,
    client_event_id: { type: String, default: '', trim: true, index: true },
    session_id: text,
    platform: { type: String, enum: APP_EVENT_PLATFORMS, default: '' },
    app_version: text,
    os_version: text,
    device_type: text,
    screen_name: text,
    previous_screen: text,
    path: { type: String, default: '', trim: true, index: true },
    route: text,
    title: text,
    element_id: text,
    element_type: text,
    target_tag: text,
    target_text: text,
    target_label: text,
    target_role: text,
    target_href: text,
    duration_ms: { type: Number, default: null, min: 0 },
    super_category_slug: { type: String, default: null, lowercase: true, trim: true, index: true },
    pod_id: { type: Schema.Types.ObjectId, ref: 'Pod', default: null, index: true },
    checkout_url: text,
    metadata: { type: Schema.Types.Mixed, default: {} },
    occurred_at: { type: Date, default: Date.now, index: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

appEventSchema.index({ user_id: 1, occurred_at: -1 });
appEventSchema.index({ user_id: 1, path: 1, occurred_at: -1 });
appEventSchema.index({ device_id: 1, client_event_id: 1 });
// Product analytics reads: one event name, one screen or one session over a period.
appEventSchema.index({ event_name: 1, occurred_at: -1 });
appEventSchema.index({ screen_name: 1, occurred_at: -1 });
appEventSchema.index({ session_id: 1, occurred_at: 1 });
appEventSchema.index({ device_id: 1, occurred_at: -1 });

export const AppEventModel = model<IAppEvent>('AppEvent', appEventSchema);
