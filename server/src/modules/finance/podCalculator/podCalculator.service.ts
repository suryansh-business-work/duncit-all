import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { getFinanceSettings } from '@modules/finance/finance/finance.model';
import { generatePodCalculatorPdf } from '@services/calculator/pod-calculator.pdf';
import { sendEmail } from '@services/email/email.service';
import {
  PodCalculatorModel,
  POD_CALCULATOR_KINDS,
  type IPodCalculator,
  type IPodCalculatorPod,
  type PodCalculatorKind,
} from './podCalculator.model';
import { lineFor, totalsOf } from './podCalculator.totals';

/** Ceiling on one saved calculation. Large enough for any real comparison,
 * small enough that a malformed client cannot write an unbounded document. */
const MAX_PODS = 50;
/**
 * Pragmatic address check, matching @duncit/regex EMAIL.
 *
 * Duplicated rather than imported because server/src takes no @duncit/*
 * dependency by design (rule 40) — the Docker image would have to carry the
 * package for one pattern.
 */
const EMAIL = /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/;

/** A projection multiplier, not a booking — bounded so the report stays sane. */
const MAX_POD_COUNT = 1000;

const KIND_SET = new Set<string>(POD_CALCULATOR_KINDS);

interface PodInput {
  pod_key?: string | null;
  name?: string | null;
  pod_amount?: number | null;
  no_of_spots?: number | null;
  pod_count?: number | null;
  gst_percent?: number | null;
  platform_fee_percent?: number | null;
  venue_amount?: number | null;
  host_commission_percent?: number | null;
  venue_commission_percent?: number | null;
  club_admin_percent?: number | null;
}

export interface SavePodCalculatorInput {
  name?: string | null;
  kind?: string | null;
  pods?: PodInput[] | null;
}

const text = (value: string | null | undefined, max: number) =>
  String(value ?? '').trim().slice(0, max);
const money = (value: number | null | undefined) =>
  Math.max(0, Math.round((Number(value) || 0) * 100) / 100);
const percent = (value: number | null | undefined) =>
  Math.min(100, Math.max(0, Math.round((Number(value) || 0) * 100) / 100));
const count = (value: number | null | undefined) => Math.max(0, Math.round(Number(value) || 0));

function podPub(pod: IPodCalculatorPod) {
  return {
    pod_key: pod.pod_key,
    name: pod.name ?? '',
    pod_amount: pod.pod_amount ?? 0,
    no_of_spots: pod.no_of_spots ?? 0,
    pod_count: pod.pod_count ?? 1,
    gst_percent: pod.gst_percent ?? 0,
    platform_fee_percent: pod.platform_fee_percent ?? 0,
    venue_amount: pod.venue_amount ?? 0,
    host_commission_percent: pod.host_commission_percent ?? 0,
    venue_commission_percent: pod.venue_commission_percent ?? 0,
    club_admin_percent: pod.club_admin_percent ?? 0,
  };
}

function toPub(doc: IPodCalculator) {
  return {
    id: doc._id.toString(),
    name: doc.name ?? '',
    kind: doc.kind ?? 'MULTI',
    pods: (doc.pods ?? []).map(podPub),
    created_by: doc.created_by ? doc.created_by.toString() : null,
    created_at: doc.created_at?.toISOString?.() ?? '',
    updated_at: doc.updated_at?.toISOString?.() ?? '',
  };
}

/**
 * Every number is re-derived from the payload rather than trusted: the client
 * sliders already clamp, but the mutation is reachable without them, and a
 * percentage over 100 or a negative ticket would print a nonsense payout on
 * every screen and every PDF that later opens the calculation.
 */
function sanitisePods(pods: PodInput[] | null | undefined): IPodCalculatorPod[] {
  return (pods ?? []).slice(0, MAX_PODS).map((pod, index) => ({
    pod_key: text(pod.pod_key, 64) || `pod-${index + 1}`,
    name: text(pod.name, 120),
    pod_amount: money(pod.pod_amount),
    no_of_spots: count(pod.no_of_spots),
    pod_count: Math.min(MAX_POD_COUNT, Math.max(1, count(pod.pod_count) || 1)),
    gst_percent: percent(pod.gst_percent),
    platform_fee_percent: percent(pod.platform_fee_percent),
    venue_amount: money(pod.venue_amount),
    host_commission_percent: percent(pod.host_commission_percent),
    venue_commission_percent: percent(pod.venue_commission_percent),
    club_admin_percent: percent(pod.club_admin_percent),
  }));
}

function requireName(input: SavePodCalculatorInput): string {
  const name = text(input.name, 160);
  if (!name) throw new GraphQLError('A calculation name is required');
  return name;
}

const kindOf = (value: string | null | undefined): PodCalculatorKind =>
  KIND_SET.has(String(value)) ? (value as PodCalculatorKind) : 'MULTI';

function requireObjectId(id: string): Types.ObjectId {
  if (!Types.ObjectId.isValid(id)) throw new GraphQLError('Calculation not found');
  return new Types.ObjectId(id);
}

async function requireDoc(id: string): Promise<IPodCalculator> {
  const doc = await PodCalculatorModel.findById(requireObjectId(id));
  if (!doc) throw new GraphQLError('Calculation not found');
  return doc;
}

/** The saved calculation rendered through the real finance engine. */
async function reportFor(doc: IPodCalculator): Promise<Buffer> {
  const settings = await getFinanceSettings();
  const lines = (doc.pods ?? []).map(lineFor);
  return generatePodCalculatorPdf({
    name: doc.name,
    kind_label: doc.kind === 'SINGLE' ? 'Single pod calculation' : 'Multi-pod comparison',
    generated_at: new Date(),
    currency_symbol: settings.currency_symbol,
    business_name: settings.business_name,
    lines,
    totals: totalsOf(lines),
    invoice_logo_url: settings.invoice_logo_url,
  });
}

/** A safe, recognisable attachment name: the calculation, slugged. */
function fileNameFor(doc: IPodCalculator): string {
  const slug = doc.name
    .replaceAll(/[^\w\s-]+/g, '')
    .trim()
    .replaceAll(/\s+/g, '-');
  return `${slug || 'pod-profit'}-report.pdf`;
}

export const podCalculatorService = {
  /** Most recently edited first — the list is a workbench, not an archive. */
  async list(kind?: string | null) {
    const docs = await PodCalculatorModel.find({ kind: kindOf(kind) })
      .sort({ updated_at: -1 })
      .limit(500);
    return docs.map(toPub);
  },

  async get(id: string) {
    const doc = await PodCalculatorModel.findById(requireObjectId(id));
    return doc ? toPub(doc) : null;
  },

  async create(input: SavePodCalculatorInput, userId: string | null) {
    const doc = await PodCalculatorModel.create({
      name: requireName(input),
      kind: kindOf(input.kind),
      pods: sanitisePods(input.pods),
      created_by: userId ? new Types.ObjectId(userId) : null,
    });
    return toPub(doc);
  },

  async update(id: string, input: SavePodCalculatorInput) {
    const doc = await PodCalculatorModel.findByIdAndUpdate(
      requireObjectId(id),
      { $set: { name: requireName(input), pods: sanitisePods(input.pods) } },
      { new: true }
    );
    if (!doc) throw new GraphQLError('Calculation not found');
    return toPub(doc);
  },

  async remove(id: string) {
    const res = await PodCalculatorModel.deleteOne({ _id: requireObjectId(id) });
    return res.deletedCount > 0;
  },

  /** The report as base64, for the browser to save. */
  async pdfBase64(id: string) {
    const doc = await requireDoc(id);
    return (await reportFor(doc)).toString('base64');
  },

  /**
   * The same report, emailed as an attachment.
   *
   * `sendEmail` deliberately does not throw — a disabled template or a provider
   * outage becomes a logged row — so its verdict is turned back into an error
   * here rather than reported to the sender as a success they never receive.
   */
  async email(id: string, to: string) {
    const address = text(to, 200);
    if (!EMAIL.test(address)) throw new GraphQLError('A valid email address is required');
    const doc = await requireDoc(id);
    const pdf = await reportFor(doc);
    const result = await sendEmail({
      to: address,
      subject: `Pod profit report - ${doc.name}`,
      template: 'pod-calculator-report',
      category: 'internal',
      vars: { calculation_name: doc.name },
      attachments: [{ filename: fileNameFor(doc), content: pdf, contentType: 'application/pdf' }],
    });
    // `accepted` empty means it reached nobody, whatever the provider returned;
    // `skipped` is the deliberate no-send (a switched-off template). Both read
    // as success to a caller that only checks for a thrown error.
    if (result.skipped || result.accepted.length === 0) {
      throw new GraphQLError(result.reason ?? 'The report could not be emailed');
    }
    return true;
  },
};
