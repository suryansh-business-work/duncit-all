import { Schema, model, type Document, Types } from 'mongoose';
import { APP_EVENT_PLATFORMS, type AppEventPlatform } from './appEvent.model';

/**
 * One app session, rolled up as its events arrive (appSession.rollup.ts).
 *
 * A session is cut on the device: it starts at launch, or on the first activity
 * after 30 minutes without any, and every event carries its id. Keeping the
 * rollup beside the events turns "sessions, their length, where they began and
 * ended" into one indexed read instead of a group over every event of the
 * period. The events stay the source of truth.
 */
export interface IAppSession extends Document {
  session_id: string;
  device_id: string;
  /** The member once they are signed in during the session; null for a visitor throughout. */
  user_id: Types.ObjectId | null;
  platform: AppEventPlatform;
  app_version: string;
  os_version: string;
  device_type: string;
  started_at: Date;
  ended_at: Date;
  /** ended_at − started_at: from the first event to the last. A one-event session lasts 0. */
  duration_ms: number;
  events: number;
  screen_views: number;
  clicks: number;
  entry_screen: string;
  entry_at: Date | null;
  exit_screen: string;
  exit_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

const text = { type: String, default: '', trim: true };

const appSessionSchema = new Schema<IAppSession>(
  {
    session_id: { type: String, required: true, trim: true, unique: true },
    device_id: { type: String, required: true, trim: true },
    user_id: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    platform: { type: String, enum: APP_EVENT_PLATFORMS, default: '' },
    app_version: text,
    os_version: text,
    device_type: text,
    started_at: { type: Date, required: true },
    ended_at: { type: Date, required: true },
    duration_ms: { type: Number, default: 0, min: 0 },
    events: { type: Number, default: 0, min: 0 },
    screen_views: { type: Number, default: 0, min: 0 },
    clicks: { type: Number, default: 0, min: 0 },
    entry_screen: text,
    entry_at: { type: Date, default: null },
    exit_screen: text,
    exit_at: { type: Date, default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

appSessionSchema.index({ started_at: -1 });
appSessionSchema.index({ user_id: 1, started_at: -1 });
appSessionSchema.index({ device_id: 1, started_at: -1 });

export const AppSessionModel = model<IAppSession>('AppSession', appSessionSchema);
