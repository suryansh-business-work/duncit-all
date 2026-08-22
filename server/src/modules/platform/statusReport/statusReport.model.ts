import { Schema, model, type Document } from 'mongoose';

/**
 * A problem report typed into the public status page (status.duncit.com).
 *
 * The probes on that page answer "is the host answering an HTTP request", and
 * a great many outages never touch that: a login that loops, a page that
 * renders empty, a payment that hangs. Those are only ever reported by the
 * person hitting them, so the status page carries a form and this is where it
 * lands — read from the Tech portal, beside the telemetry the machines write.
 *
 * The form is PUBLIC and unauthenticated by design: someone locked out of every
 * console is exactly the reporter this exists for. So nothing here is taken on
 * trust — `ip`, `user_agent` and `user_id` are read off the request by the
 * server (identityFromRequest), never from the body, and the rest is validated
 * and length-capped before it is written.
 */
export type StatusReportStatus = 'NEW' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';

/** What the reporter is seeing, so a row can be triaged before it is read. */
export type StatusReportImpact =
  | 'CANNOT_ACCESS'
  | 'ERRORS'
  | 'SLOW'
  | 'LOGIN'
  | 'PAYMENT'
  | 'OTHER';

export const STATUS_REPORT_STATUSES: readonly StatusReportStatus[] = [
  'NEW',
  'IN_PROGRESS',
  'RESOLVED',
  'CLOSED',
];

export const STATUS_REPORT_IMPACTS: readonly StatusReportImpact[] = [
  'CANNOT_ACCESS',
  'ERRORS',
  'SLOW',
  'LOGIN',
  'PAYMENT',
  'OTHER',
];

export interface IStatusReport extends Document {
  /** Catalogue slug of the affected service, or '' for "not sure". */
  service_key: string;
  /**
   * The catalogue's display name, resolved server-side at write time.
   *
   * Denormalized on purpose: the catalogue is code, and a service renamed or
   * retired next quarter would otherwise rewrite the history of every report
   * filed against it — or leave a bare slug on screen once it is gone.
   */
  service_name: string;
  /**
   * The affected service's ADDRESS, resolved from the catalogue at write time.
   *
   * Denormalized for the same reason the name is: a report has to still say
   * which website it was about after that service is renamed, moved to another
   * host, or retired altogether.
   */
  service_url: string;
  impact: StatusReportImpact;
  name: string;
  email: string;
  /** Where the reporter hit it. Optional — plenty of reports have no one page. */
  page_url: string;
  message: string;
  /** Which deployment answered the form (production / staging). */
  environment: string;
  status: StatusReportStatus;
  /** Read off the request, so neither can be forged by a body. */
  ip: string | null;
  user_agent: string | null;
  /** Set only when the reporter happened to be signed in on this browser. */
  user_id: string | null;
  /**
   * Screenshots the reporter attached, as hosted URLs.
   *
   * A picture of the error is the single most useful thing on a report — it
   * carries the message, the URL bar and the state of the page in one go,
   * which is three things nobody types out. Uploaded server-side from the
   * mutation, so the public form needs no upload credential of its own.
   */
  image_urls: string[];
  /** Images added by an operator while triaging — annotations, logs, evidence. */
  staff_image_urls: string[];
  /** Free-text triage note written from the Tech portal. */
  note: string;
  created_at: Date;
  updated_at: Date;
}

const schema = new Schema<IStatusReport>(
  {
    service_key: { type: String, default: '', trim: true, index: true },
    service_name: { type: String, default: '', trim: true },
    service_url: { type: String, default: '', trim: true },
    impact: { type: String, enum: STATUS_REPORT_IMPACTS, default: 'OTHER', index: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true, index: true },
    page_url: { type: String, default: '', trim: true },
    message: { type: String, required: true },
    environment: { type: String, default: 'production', index: true },
    status: { type: String, enum: STATUS_REPORT_STATUSES, default: 'NEW', index: true },
    ip: { type: String, default: null },
    user_agent: { type: String, default: null },
    user_id: { type: String, default: null, index: true },
    image_urls: { type: [String], default: [] },
    staff_image_urls: { type: [String], default: [] },
    note: { type: String, default: '' },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

// The Tech portal's default view is "the new ones, newest first".
schema.index({ status: 1, created_at: -1 });

export const StatusReportModel = model<IStatusReport>('StatusReport', schema);
