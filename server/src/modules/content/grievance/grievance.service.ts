import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { nextEntityNo } from '@modules/venues/entityIdCounter';
import { logs } from '@observability/log';
import { runTableQuery, type TableEntityConfig, type TableQueryInput } from '@utils/table-query';
import { sendGrievanceAcknowledgement } from './grievance.email';
import {
  GRIEVANCE_SOURCES,
  GRIEVANCE_STATUSES,
  GrievanceTicketModel,
  type GrievanceSource,
  type GrievanceStatus,
  type IGrievanceTicket,
} from './grievanceTicket.model';
import { GrievanceOfficerModel, type IGrievanceOfficer } from './grievanceOfficer.model';

function fail(code: string, msg: string): never {
  throw new GraphQLError(msg, { extensions: { code } });
}

// RFC 5321 caps an address at 254 characters. The bound is checked BEFORE the
// pattern because the pattern backtracks quadratically on a long non-matching
// string, and this runs on unauthenticated grievance-form input.
const MAX_EMAIL_LENGTH = 254;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const isEmail = (value: string) => value.length <= MAX_EMAIL_LENGTH && EMAIL_RE.test(value);
// Digits, with the punctuation people actually type. Length is checked on the
// digits alone so "+91 98765 43210" and "9876543210" are both accepted.
const PHONE_ALLOWED_RE = /^[\d\s+()-]+$/;

const toPub = (g: IGrievanceTicket) => ({
  id: String(g._id),
  grievance_no: g.grievance_no ?? '',
  source: g.source,
  name: g.name,
  email: g.email,
  phone: g.phone,
  address: g.address ?? '',
  support_ticket_ref: g.support_ticket_ref ?? '',
  subject: g.subject,
  description: g.description,
  status: g.status,
  resolution: g.resolution ?? '',
  resolved_at: g.resolved_at ? g.resolved_at.toISOString() : null,
  // The id the GrievanceTicket field resolver turns into a name.
  handled_by: g.handled_by ?? null,
  created_at: g.created_at?.toISOString?.() ?? '',
  updated_at: g.updated_at?.toISOString?.() ?? '',
});

const officerToPub = (o: IGrievanceOfficer | null) => ({
  name: o?.name ?? '',
  email: o?.email ?? '',
  phone: o?.phone ?? '',
  address: o?.address ?? '',
  updated_at: o?.updated_at ? o.updated_at.toISOString() : null,
});

/**
 * Allowlists for the shared table engine (grievanceTicketsTable — DUNCIT TABLE
 * CONTRACT v1). The id leads because it is the handle a complainant quotes
 * back when they chase their grievance.
 */
const GRIEVANCE_TABLE_CONFIG: TableEntityConfig = {
  searchFields: [
    'grievance_no',
    'name',
    'email',
    'phone',
    'support_ticket_ref',
    'subject',
    'description',
  ],
  sortFields: {
    grievance_no: 'grievance_no',
    name: 'name',
    email: 'email',
    support_ticket_ref: 'support_ticket_ref',
    subject: 'subject',
    status: 'status',
    source: 'source',
    created_at: 'created_at',
    updated_at: 'updated_at',
  },
  filterFields: {
    grievance_no: { type: 'string' },
    name: { type: 'string' },
    email: { type: 'string' },
    phone: { type: 'string' },
    support_ticket_ref: { type: 'string' },
    subject: { type: 'string' },
    status: { type: 'string' },
    source: { type: 'string' },
    created_at: { type: 'date' },
    updated_at: { type: 'date' },
  },
  // Oldest open first: the redressal clock runs from when it was received.
  defaultSort: { created_at: -1 },
};

interface SubmitInput {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  support_ticket_ref?: string;
  subject?: string;
  description?: string;
  source?: GrievanceSource;
}

/**
 * Validate what a stranger typed.
 *
 * The client validates too, but this is the only check that is actually a
 * gate: the mutation is reachable without an account, so anything the client
 * enforces is a suggestion. Every message names the field, because a form that
 * says "Invalid input" makes the visitor guess.
 */
function cleanSubmission(input: SubmitInput) {
  const name = (input.name ?? '').trim();
  const email = (input.email ?? '').trim().toLowerCase();
  const phone = (input.phone ?? '').trim();
  const address = (input.address ?? '').trim();
  const supportTicketRef = (input.support_ticket_ref ?? '').trim();
  const subject = (input.subject ?? '').trim();
  const description = (input.description ?? '').trim();

  if (!name) fail('BAD_USER_INPUT', 'Name is required');
  if (name.length > 120) fail('BAD_USER_INPUT', 'Name is too long');
  if (!email) fail('BAD_USER_INPUT', 'Email is required');
  if (!isEmail(email)) fail('BAD_USER_INPUT', 'Enter a valid email address');
  if (!phone) fail('BAD_USER_INPUT', 'Phone is required');
  if (!PHONE_ALLOWED_RE.test(phone)) fail('BAD_USER_INPUT', 'Enter a valid phone number');
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 7 || digits.length > 15) fail('BAD_USER_INPUT', 'Enter a valid phone number');
  if (address.length > 500) fail('BAD_USER_INPUT', 'Address is too long');
  // Length only, never presence: the forms are what demand a ticket, and a
  // grievance that reached us without one is still a grievance we have to hold
  // — the officer rejects it, the intake does not drop it. See the model.
  if (supportTicketRef.length > 60) fail('BAD_USER_INPUT', 'Support ticket reference is too long');
  if (!subject) fail('BAD_USER_INPUT', 'Subject is required');
  if (subject.length > 200) fail('BAD_USER_INPUT', 'Subject is too long');
  if (!description) fail('BAD_USER_INPUT', 'Please describe your grievance');
  if (description.length > 5000) fail('BAD_USER_INPUT', 'Description is too long');

  const source: GrievanceSource = GRIEVANCE_SOURCES.includes(input.source as GrievanceSource)
    ? (input.source as GrievanceSource)
    : 'APP';

  return {
    name,
    email,
    phone,
    address,
    support_ticket_ref: supportTicketRef,
    subject,
    description,
    source,
  };
}

export const grievanceService = {
  /**
   * Raise a grievance.
   *
   * Reachable without an account, because a person with a grievance about
   * Duncit may well have already deleted theirs. When a signed-in user does
   * raise one, the account is recorded alongside the details they typed —
   * those details are what the grievance was filed under, so they are kept
   * even when the profile could have supplied them.
   */
  async submit(userId: string | null, input: SubmitInput) {
    const payload = cleanSubmission(input);
    const doc = await GrievanceTicketModel.create({
      ...payload,
      user_id: userId && Types.ObjectId.isValid(userId) ? new Types.ObjectId(userId) : null,
    });

    // Best-effort: the grievance is already recorded, so a mail provider
    // having a bad minute must not tell the complainant their grievance
    // failed. The id is on screen either way.
    try {
      await sendGrievanceAcknowledgement(toPub(doc));
    } catch (error) {
      logs.server.warn('grievance', 'submit', {
        error,
        msg: 'grievance acknowledgement email failed',
        grievance_no: doc.grievance_no,
      });
    }
    return toPub(doc);
  },

  /** Server-side table page for the Legal portal's queue. */
  async table(input?: TableQueryInput | null) {
    const { docs, total, page, page_size } = await runTableQuery<IGrievanceTicket>(
      GrievanceTicketModel,
      {},
      input,
      GRIEVANCE_TABLE_CONFIG
    );
    return { rows: docs.map(toPub), total, page, page_size };
  },

  async getById(id: string) {
    if (!Types.ObjectId.isValid(id)) fail('BAD_USER_INPUT', 'Invalid grievance id');
    const doc = await GrievanceTicketModel.findById(id);
    return doc ? toPub(doc) : null;
  },

  /** How the queue is doing, for the dashboard. */
  async stats() {
    const grouped = await GrievanceTicketModel.aggregate<{ _id: GrievanceStatus; count: number }>([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    const counts = new Map(grouped.map((g) => [g._id, g.count]));
    const total = grouped.reduce((sum, g) => sum + g.count, 0);
    return {
      total,
      by_status: GRIEVANCE_STATUSES.map((status) => ({
        status,
        count: counts.get(status) ?? 0,
      })),
    };
  },

  /**
   * Move a grievance along, and record who moved it.
   *
   * `resolved_at` is stamped the first time it reaches an end state and
   * cleared if it is reopened, so "how long did this take" stays answerable
   * from the record rather than from an audit trail nobody reads.
   */
  async updateStatus(
    userId: string,
    id: string,
    input: { status?: GrievanceStatus; resolution?: string }
  ) {
    if (!Types.ObjectId.isValid(id)) fail('BAD_USER_INPUT', 'Invalid grievance id');
    const doc = await GrievanceTicketModel.findById(id);
    if (!doc) fail('NOT_FOUND', 'Grievance not found');
    if (input.status !== undefined) {
      if (!GRIEVANCE_STATUSES.includes(input.status)) {
        fail('BAD_USER_INPUT', 'Unknown grievance status');
      }
      doc!.status = input.status;
      const closed = input.status === 'RESOLVED' || input.status === 'REJECTED';
      doc!.resolved_at = closed ? (doc!.resolved_at ?? new Date()) : null;
    }
    if (input.resolution !== undefined) doc!.resolution = String(input.resolution).slice(0, 5000);
    doc!.handled_by = new Types.ObjectId(userId);
    await doc!.save();
    return toPub(doc);
  },

  /** The published Grievance Officer. Readable by anyone — that is the point of it. */
  async officer() {
    const doc = await GrievanceOfficerModel.findOne({ key: 'default' });
    return officerToPub(doc);
  },

  /**
   * Save the officer's details.
   *
   * Name, email and phone are what gets published, so they are required here
   * even though the row starts blank — a half-filled officer block is worse
   * than an empty one, because it looks answered.
   */
  async saveOfficer(input: { name?: string; email?: string; phone?: string; address?: string }) {
    const name = (input.name ?? '').trim();
    const email = (input.email ?? '').trim().toLowerCase();
    const phone = (input.phone ?? '').trim();
    const address = (input.address ?? '').trim();

    if (!name) fail('BAD_USER_INPUT', 'Name is required');
    if (!email) fail('BAD_USER_INPUT', 'Email is required');
    if (!isEmail(email)) fail('BAD_USER_INPUT', 'Enter a valid email address');
    if (!phone) fail('BAD_USER_INPUT', 'Phone is required');
    if (!PHONE_ALLOWED_RE.test(phone)) fail('BAD_USER_INPUT', 'Enter a valid phone number');
    if (address.length > 500) fail('BAD_USER_INPUT', 'Address is too long');

    const doc = await GrievanceOfficerModel.findOneAndUpdate(
      { key: 'default' },
      { $set: { name, email, phone, address } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    return officerToPub(doc);
  },

  /**
   * Give an id to any grievance that has none.
   *
   * The hook that mints them fires on INSERT, so anything written by a path
   * that bypasses it would sit in the queue showing a dash where its permanent
   * handle belongs. Idempotent, and it only looks for the missing.
   */
  async backfillIds(): Promise<{ repaired: number }> {
    const idless = await GrievanceTicketModel.find({
      $or: [{ grievance_no: null }, { grievance_no: { $exists: false } }, { grievance_no: '' }],
    }).select('_id');
    for (const doc of idless) {
      doc.grievance_no = await nextEntityNo('GRV', 'grievance');
      await doc.save();
    }
    return { repaired: idless.length };
  },
};
