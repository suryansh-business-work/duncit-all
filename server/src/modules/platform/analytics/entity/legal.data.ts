import type { PipelineStage, Types } from 'mongoose';
import { GrievanceTicketModel } from '@modules/content/grievance/grievanceTicket.model';
import { ContentReportModel } from '@modules/content/report/contentReport.model';
import { ContractModel } from '@modules/content/contract/contract.model';
import { LegalDocumentModel } from '@modules/content/legalDocument/legalDocument.model';
import { PolicyModel } from '@modules/content/policy/policy.model';
import { PolicyAcceptanceModel, policyContentHash } from '@modules/content/policyAcceptance/policyAcceptance.model';
import { UserModel } from '@modules/access/user/user.model';
import { LIVE_USERS } from './users.data';
import { inRange, type AnalyticsWindow } from './window';
import { perDay, tallyOf, type CountRow, type PeriodDayKey, type Tally } from './aggregates';

/**
 * What the Legal analytics page reads: grievances, content reports, contracts
 * and documents out for signature, and who has accepted the policies as they
 * read today.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
const OPEN_CASES = ['RECEIVED', 'IN_REVIEW'];

/**
 * Nothing in the app sets a deadline for a grievance, so the legal one is used:
 * the IT (Intermediary Guidelines) Rules, 2021 give the grievance officer
 * fifteen days to dispose of a complaint.
 */
export const GRIEVANCE_REDRESSAL_DAYS = 15;

/* ------------------------ grievances and reports ------------------------ */

/** Cases closed per day: `first` and `second` are the two end states, `days` their summed age. */
export interface ClosedRow {
  _id: PeriodDayKey;
  first: number;
  second: number;
  days: number;
}

const closedPerDay = (window: AnalyticsWindow, [first, second]: readonly [string, string]) =>
  perDay('resolved_at', window, {
    first: { $sum: { $cond: [{ $eq: ['$status', first] }, 1, 0] } },
    second: { $sum: { $cond: [{ $eq: ['$status', second] }, 1, 0] } },
    days: { $sum: { $divide: [{ $subtract: ['$resolved_at', '$created_at'] }, DAY_MS] } },
  });

export const loadFiledGrievances = (window: AnalyticsWindow) =>
  GrievanceTicketModel.aggregate<CountRow>(perDay('created_at', window));

export const loadClosedGrievances = (window: AnalyticsWindow) =>
  GrievanceTicketModel.aggregate<ClosedRow>(closedPerDay(window, ['RESOLVED', 'REJECTED']));

export const loadFiledReports = (window: AnalyticsWindow) =>
  ContentReportModel.aggregate<CountRow>(perDay('created_at', window));

export const loadClosedReports = (window: AnalyticsWindow) =>
  ContentReportModel.aggregate<ClosedRow>(closedPerDay(window, ['ACTIONED', 'DISMISSED']));

/** Open grievances, open grievances older than the redressal deadline, and open reports — right now. */
export function countOpenCases(now: Date) {
  const deadline = new Date(now.getTime() - GRIEVANCE_REDRESSAL_DAYS * DAY_MS);
  return Promise.all([
    GrievanceTicketModel.countDocuments({ status: { $in: OPEN_CASES } }),
    GrievanceTicketModel.countDocuments({ status: { $in: OPEN_CASES }, created_at: { $lt: deadline } }),
    ContentReportModel.countDocuments({ status: { $in: OPEN_CASES } }),
  ]);
}

/** A grievance escalates a support ticket when it names one; the officer rejects the ones that do not. */
const ESCALATION = {
  $cond: [{ $gt: [{ $strLenCP: { $ifNull: ['$support_ticket_ref', ''] } }, 0] }, 'leg_with_ticket', 'leg_without_ticket'],
};

export async function loadGrievanceMix(from: Date, to: Date) {
  const [mix] = await GrievanceTicketModel.aggregate<{ status: Tally[]; source: Tally[]; escalation: Tally[] }>([
    { $match: { created_at: inRange(from, to) } },
    { $facet: { status: [tallyOf('$status')], source: [tallyOf('$source')], escalation: [tallyOf(ESCALATION)] } },
  ]);
  return mix;
}

export async function loadReportMix(from: Date, to: Date) {
  const [mix] = await ContentReportModel.aggregate<{ reason: Tally[]; status: Tally[]; target: Tally[] }>([
    { $match: { created_at: inRange(from, to) } },
    { $facet: { reason: [tallyOf('$reason')], status: [tallyOf('$status')], target: [tallyOf('$target_type')] } },
  ]);
  return mix;
}

/* -------------------------------- signing ------------------------------- */

export interface SigningFigures {
  sent_now: number;
  sent_before: number;
  signed_now: number;
  signed_before: number;
  /** Summed days from being sent to being fully signed, for the average. */
  days_now: number;
  days_before: number;
  pending: number;
}

const within = (field: string, from: Date, to: Date) => ({ $and: [{ $gte: [field, from] }, { $lt: [field, to] }] });
const countWithin = (field: string, from: Date, to: Date) => ({ $sum: { $cond: [within(field, from, to), 1, 0] } });
const daysWithin = (from: Date, to: Date) => ({
  $sum: { $cond: [within('$signed_at', from, to), { $divide: [{ $subtract: ['$signed_at', '$sent'] }, DAY_MS] }, 0] },
});

/**
 * A record is "sent" when its first signatory is added — nothing else stamps
 * the moment somebody was asked to sign — and signed when the last one signs.
 */
function signingPipeline(window: AnalyticsWindow): PipelineStage[] {
  return [
    { $project: { sent: { $min: '$signatories.created_at' }, signed_at: { $ifNull: ['$signed_at', null] } } },
    { $match: { sent: { $ne: null } } },
    {
      $group: {
        _id: null,
        sent_now: countWithin('$sent', window.from, window.to),
        sent_before: countWithin('$sent', window.prevFrom, window.prevTo),
        signed_now: countWithin('$signed_at', window.from, window.to),
        signed_before: countWithin('$signed_at', window.prevFrom, window.prevTo),
        days_now: daysWithin(window.from, window.to),
        days_before: daysWithin(window.prevFrom, window.prevTo),
        pending: { $sum: { $cond: [{ $eq: ['$signed_at', null] }, 1, 0] } },
      },
    },
  ];
}

/** Contracts and legal documents sign the same way, so both are read and added together. */
export async function loadSigning(window: AnalyticsWindow): Promise<SigningFigures[]> {
  const [contracts, documents] = await Promise.all([
    ContractModel.aggregate<SigningFigures>(signingPipeline(window)),
    LegalDocumentModel.aggregate<SigningFigures>(signingPipeline(window)),
  ]);
  return [...contracts, ...documents];
}

/* ------------------------------- policies ------------------------------- */

export interface PolicyStanding {
  id: string;
  title: string;
  /** Every wording the policy has had, the current one included. */
  wordings: number;
  /** Accounts that accepted the wording it has now. */
  accepted: number;
}

interface RequiredPolicy {
  _id: Types.ObjectId;
  title: string;
  content: string;
  versions: Array<{ _id: Types.ObjectId }>;
}

/** The policies signup asks for, how many accounts accepted each as it reads now, and how many accepted all. */
export async function loadPolicyStanding() {
  const [required, accounts] = await Promise.all([
    PolicyModel.find({ is_active: true, requires_signup_acceptance: { $ne: false } })
      .sort({ sort_order: 1, title: 1 })
      .select('title content versions._id')
      .lean<RequiredPolicy[]>(),
    UserModel.countDocuments(LIVE_USERS),
  ]);
  if (required.length === 0) return { accounts, complete: 0, policies: [] };
  // An edit changes the hash, so only a row carrying today's hash is an acceptance of today's words.
  const current = required.map((policy) => ({ policy_id: policy._id, content_hash: policyContentHash(policy.content) }));
  const [counts] = await PolicyAcceptanceModel.aggregate<{
    per_policy: Array<{ _id: Types.ObjectId; count: number }>;
    complete: Array<{ users: number }>;
  }>([
    { $match: { $or: current } },
    {
      $facet: {
        per_policy: [tallyOf('$policy_id')],
        complete: [{ $group: { _id: '$user_id', n: { $sum: 1 } } }, { $match: { n: required.length } }, { $count: 'users' }],
      },
    },
  ]);
  const accepted = new Map(counts.per_policy.map((row) => [String(row._id), row.count]));
  const policies: PolicyStanding[] = required.map((policy) => ({
    id: String(policy._id),
    title: policy.title,
    wordings: policy.versions.length + 1,
    accepted: accepted.get(String(policy._id)) ?? 0,
  }));
  return { accounts, complete: counts.complete.at(0)?.users ?? 0, policies };
}

export interface AcceptanceRow {
  _id: PeriodDayKey;
  signup: number;
  account: number;
}

/** Policy acceptances per day, split into ones given while signing up and ones given later from the account. */
export const loadAcceptances = (window: AnalyticsWindow) =>
  PolicyAcceptanceModel.aggregate<AcceptanceRow>(
    perDay('accepted_at', window, {
      signup: { $sum: { $cond: [{ $eq: ['$method', 'ACCOUNT'] }, 0, 1] } },
      account: { $sum: { $cond: [{ $eq: ['$method', 'ACCOUNT'] }, 1, 0] } },
    })
  );
