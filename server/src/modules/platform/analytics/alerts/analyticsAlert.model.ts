import { Schema, model, type Document } from 'mongoose';

/**
 * A watch on one Analytics tile (Analytics > Settings > Alerts): "tell me when
 * the cancellation rate goes above 8%", "when bookings fall 30% against the
 * period before". Checked every hour; the people listed are mailed — and Slack
 * told, if asked — when it trips, and reminded once a day while it stays tripped.
 */

/** ABOVE / BELOW compare the value; RISES_BY / FALLS_BY compare its change, in %, against the period before. */
export type AnalyticsAlertCondition = 'ABOVE' | 'BELOW' | 'RISES_BY' | 'FALLS_BY';
export const ANALYTICS_ALERT_CONDITIONS: readonly AnalyticsAlertCondition[] = ['ABOVE', 'BELOW', 'RISES_BY', 'FALLS_BY'];

export type AnalyticsAlertStatus = 'OK' | 'TRIGGERED' | 'ERROR';

export interface IAnalyticsAlert extends Document {
  name: string;
  entity: string;
  kpi_key: string;
  condition: AnalyticsAlertCondition;
  threshold: number;
  /** The period the tile is read over — the dashboards' own 7, 30, 90 or 365 days. */
  days: number;
  emails: string[];
  slack: boolean;
  is_active: boolean;
  last_checked_at: Date | null;
  last_value: number | null;
  last_status: AnalyticsAlertStatus | null;
  last_error: string | null;
  /** When people were last told — the once-a-day reminder counts from here. */
  last_notified_at: Date | null;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

const alertSchema = new Schema<IAnalyticsAlert>(
  {
    name: { type: String, required: true, trim: true },
    entity: { type: String, required: true },
    kpi_key: { type: String, required: true },
    condition: { type: String, enum: ANALYTICS_ALERT_CONDITIONS, required: true },
    threshold: { type: Number, required: true },
    days: { type: Number, default: 7 },
    emails: { type: [String], default: [] },
    slack: { type: Boolean, default: false },
    is_active: { type: Boolean, default: true },
    last_checked_at: { type: Date, default: null },
    last_value: { type: Number, default: null },
    last_status: { type: String, enum: ['OK', 'TRIGGERED', 'ERROR', null], default: null },
    last_error: { type: String, default: null },
    last_notified_at: { type: Date, default: null },
    created_by: { type: String, default: '' },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

alertSchema.index({ is_active: 1 });

export const AnalyticsAlertModel = model<IAnalyticsAlert>('AnalyticsAlert', alertSchema);
