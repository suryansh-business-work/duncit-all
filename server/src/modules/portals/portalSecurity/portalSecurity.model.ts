import { Schema, model, type InferSchemaType } from 'mongoose';
import {
  ACCESS_ACTIONS,
  EXCEPTION_STATUSES,
  PORTAL_SECURITY_ACCESS_LOG_RETENTION_DAYS,
  PORTAL_SECURITY_RETENTION_DAYS,
  VERIFICATION_METHODS,
  VERIFICATION_RESULTS,
} from './portalSecurity.constants';

const DAY_SECONDS = 24 * 60 * 60;

/**
 * One Security Verification: who, on which console, from where, with what, and
 * what they agreed to.
 *
 * `ip` and `location` are SEALED (AES-256-GCM, the same sealing social tokens
 * use) so a database dump or a stray read does not hand them out; the only
 * reader that opens them is the detail view, which writes an access-trail row
 * first. `ip_hash` (an HMAC) exists only so an administrator can search by an
 * exact address without that address being readable in the list.
 *
 * Rows expire on their own after PORTAL_SECURITY_RETENTION_DAYS. `user_id` is a
 * `ref: 'User'`, so account deletion finds and purges these with the rest of
 * the person's data.
 */
const verificationSchema = new Schema(
  {
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    /** Snapshots: the name and roles as they were at the time, which a later rename must not rewrite. */
    user_name: { type: String, default: '' },
    user_email: { type: String, default: '' },
    roles: { type: [String], default: [] },
    /** The HR portal's answer at the time: is this person on the team structure, and in which seat. */
    employee: {
      is_employee: { type: Boolean, default: false },
      title: { type: String, default: null },
      department: { type: String, default: null },
      employment_type: { type: String, default: null },
    },
    portal_key: { type: String, required: true },
    result: { type: String, enum: VERIFICATION_RESULTS, required: true },
    method: { type: String, enum: VERIFICATION_METHODS, default: null },
    policy_version: { type: String, required: true },
    notice_version: { type: String, required: true },
    consent: {
      authorized_person: { type: Boolean, default: false },
      credentials_not_shared: { type: Boolean, default: false },
      policies_acknowledged: { type: Boolean, default: false },
      location_consent: { type: Boolean, default: false },
    },
    /** AES-GCM sealed address, as the server saw it through the trusted proxy. */
    ip_sealed: { type: String, default: null },
    ip_hash: { type: String, default: null },
    /** Coarse, non-identifying shape for the list: `103.21.x.x`. */
    ip_masked: { type: String, default: null },
    /** Where the address APPROXIMATELY belongs — a lookup table, never a position. */
    ip_geo: {
      country: { type: String, default: null },
      region: { type: String, default: null },
      city: { type: String, default: null },
    },
    /** AES-GCM sealed `{"lat":…,"lng":…}` from the browser's location API, with consent. */
    location_sealed: { type: String, default: null },
    has_location: { type: Boolean, default: false },
    accuracy_m: { type: Number, default: null },
    /** Why there is no fix: PERMISSION_DENIED, TIMEOUT, … or null when there is one. */
    location_error: { type: String, default: null },
    device: {
      browser: { type: String, default: null },
      os: { type: String, default: null },
      device_type: { type: String, default: null },
      user_agent: { type: String, default: null },
      duid: { type: String, default: null },
      timezone: { type: String, default: null },
      language: { type: String, default: null },
      platform: { type: String, default: null },
    },
    exception_id: { type: Schema.Types.ObjectId, ref: 'PortalSecurityException', default: null },
    /** When the sign-in this verification belongs to happened. */
    signed_in_at: { type: Date, default: null },
    /** Declared here, not left to the schema option, so the inferred type carries it and the TTL index below reads it. */
    created_at: { type: Date, default: () => new Date() },
  },
  { versionKey: false }
);

verificationSchema.index({ user_id: 1, created_at: -1 });
verificationSchema.index({ portal_key: 1, created_at: -1 });
verificationSchema.index({ result: 1, created_at: -1 });
verificationSchema.index({ ip_hash: 1 });
verificationSchema.index({ created_at: -1 });
verificationSchema.index({ created_at: 1 }, { expireAfterSeconds: PORTAL_SECURITY_RETENTION_DAYS * DAY_SECONDS });

export type PortalSecurityVerificationDoc = InferSchemaType<typeof verificationSchema>;
export const PortalSecurityVerificationModel = model('PortalSecurityVerification', verificationSchema);

/**
 * Who read the verification log, and which row. A log of locations and
 * addresses is only trustworthy if reading it is itself recorded.
 */
const accessLogSchema = new Schema(
  {
    actor_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    actor_name: { type: String, default: '' },
    actor_roles: { type: [String], default: [] },
    action: { type: String, enum: ACCESS_ACTIONS, required: true },
    /** The verification row opened (VIEW); null for a list. */
    record_id: { type: Schema.Types.ObjectId, default: null },
    /** The search the list was run with, trimmed — never the rows returned. */
    query_summary: { type: String, default: null },
    ip: { type: String, default: null },
    created_at: { type: Date, default: () => new Date() },
  },
  { versionKey: false }
);

accessLogSchema.index({ actor_id: 1, created_at: -1 });
accessLogSchema.index({ record_id: 1, created_at: -1 });
accessLogSchema.index(
  { created_at: 1 },
  { expireAfterSeconds: PORTAL_SECURITY_ACCESS_LOG_RETENTION_DAYS * DAY_SECONDS }
);

export type PortalSecurityAccessLogDoc = InferSchemaType<typeof accessLogSchema>;
export const PortalSecurityAccessLogModel = model('PortalSecurityAccessLog', accessLogSchema);

/**
 * A request for the administrator-approved alternative to sharing a location.
 *
 * Declining location is allowed, but it never silently bypasses the check: the
 * person asks, an administrator decides, and an APPROVED request is spent by
 * one verification (USED) or lapses (EXPIRED).
 */
const exceptionSchema = new Schema(
  {
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    user_name: { type: String, default: '' },
    portal_key: { type: String, required: true },
    reason: { type: String, required: true },
    location_error: { type: String, default: null },
    status: { type: String, enum: EXCEPTION_STATUSES, default: 'PENDING' },
    decided_by: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    decided_by_name: { type: String, default: null },
    decided_at: { type: Date, default: null },
    decision_note: { type: String, default: null },
    /** An approval can be used until this moment. */
    expires_at: { type: Date, default: null },
    used_at: { type: Date, default: null },
    created_at: { type: Date, default: () => new Date() },
  },
  { versionKey: false }
);

exceptionSchema.index({ user_id: 1, portal_key: 1, created_at: -1 });
exceptionSchema.index({ status: 1, created_at: -1 });
exceptionSchema.index({ created_at: 1 }, { expireAfterSeconds: PORTAL_SECURITY_RETENTION_DAYS * DAY_SECONDS });

export type PortalSecurityExceptionDoc = InferSchemaType<typeof exceptionSchema>;
export const PortalSecurityExceptionModel = model('PortalSecurityException', exceptionSchema);
