import { Schema, model, type Document } from 'mongoose';

/**
 * A recorded incident affecting one monitored service — the "incident
 * database" that powers the status page's 90-day uptime bars and the
 * Incidents feed. Real outages can be inserted here (manually or by future
 * automation); a small set of historical samples is seeded so the chart is
 * populated with minimum data.
 */
export type IncidentImpact = 'degraded' | 'partial_outage' | 'major_outage';
export type IncidentStatus = 'investigating' | 'identified' | 'monitoring' | 'resolved';

export const INCIDENT_IMPACTS: readonly IncidentImpact[] = [
  'degraded',
  'partial_outage',
  'major_outage',
];
export const INCIDENT_STATUSES: readonly IncidentStatus[] = [
  'investigating',
  'identified',
  'monitoring',
  'resolved',
];

export interface IIncident extends Document {
  service_key: string;
  title: string;
  body: string;
  impact: IncidentImpact;
  status: IncidentStatus;
  started_at: Date;
  /** null while the incident is still open. */
  resolved_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

const schema = new Schema<IIncident>(
  {
    service_key: { type: String, required: true, index: true, trim: true },
    title: { type: String, required: true, trim: true },
    body: { type: String, default: '', trim: true },
    impact: { type: String, enum: INCIDENT_IMPACTS, required: true },
    status: { type: String, enum: INCIDENT_STATUSES, default: 'investigating' },
    started_at: { type: Date, required: true, index: true },
    resolved_at: { type: Date, default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

schema.index({ service_key: 1, started_at: -1 });

export const IncidentModel = model<IIncident>('Incident', schema);
