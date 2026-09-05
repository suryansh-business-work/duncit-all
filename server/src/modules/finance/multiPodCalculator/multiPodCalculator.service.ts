import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import {
  MultiPodCalculatorModel,
  type IMultiPodCalculator,
  type IMultiPodCalculatorPod,
} from './multiPodCalculator.model';

/** Ceiling on one comparison. Large enough for any real scenario, small enough
 * that a malformed client cannot write an unbounded document. */
const MAX_PODS = 50;

interface PodInput {
  pod_key?: string | null;
  name?: string | null;
  pod_amount?: number | null;
  no_of_spots?: number | null;
  gst_percent?: number | null;
  platform_fee_percent?: number | null;
  venue_amount?: number | null;
  host_commission_percent?: number | null;
  venue_commission_percent?: number | null;
  club_admin_percent?: number | null;
}

export interface SaveMultiPodCalculatorInput {
  name?: string | null;
  pods?: PodInput[] | null;
}

const text = (value: string | null | undefined, max: number) => String(value ?? '').trim().slice(0, max);
const money = (value: number | null | undefined) => Math.max(0, Math.round((Number(value) || 0) * 100) / 100);
const percent = (value: number | null | undefined) => Math.min(100, Math.max(0, Math.round((Number(value) || 0) * 100) / 100));
const count = (value: number | null | undefined) => Math.max(0, Math.round(Number(value) || 0));

function podPub(pod: IMultiPodCalculatorPod) {
  return {
    pod_key: pod.pod_key,
    name: pod.name ?? '',
    pod_amount: pod.pod_amount ?? 0,
    no_of_spots: pod.no_of_spots ?? 0,
    gst_percent: pod.gst_percent ?? 0,
    platform_fee_percent: pod.platform_fee_percent ?? 0,
    venue_amount: pod.venue_amount ?? 0,
    host_commission_percent: pod.host_commission_percent ?? 0,
    venue_commission_percent: pod.venue_commission_percent ?? 0,
    club_admin_percent: pod.club_admin_percent ?? 0,
  };
}

function toPub(doc: IMultiPodCalculator) {
  return {
    id: String(doc._id),
    name: doc.name ?? '',
    pods: (doc.pods ?? []).map(podPub),
    created_by: doc.created_by ? String(doc.created_by) : null,
    created_at: doc.created_at?.toISOString?.() ?? '',
    updated_at: doc.updated_at?.toISOString?.() ?? '',
  };
}

/**
 * Every number is re-derived from the payload rather than trusted: the client
 * sliders already clamp, but the mutation is reachable without them, and a
 * percentage over 100 or a negative ticket would print a nonsense payout on
 * every screen that later opens the comparison.
 */
function sanitisePods(pods: PodInput[] | null | undefined): IMultiPodCalculatorPod[] {
  return (pods ?? []).slice(0, MAX_PODS).map((pod, index) => ({
    pod_key: text(pod.pod_key, 64) || `pod-${index + 1}`,
    name: text(pod.name, 120),
    pod_amount: money(pod.pod_amount),
    no_of_spots: count(pod.no_of_spots),
    gst_percent: percent(pod.gst_percent),
    platform_fee_percent: percent(pod.platform_fee_percent),
    venue_amount: money(pod.venue_amount),
    host_commission_percent: percent(pod.host_commission_percent),
    venue_commission_percent: percent(pod.venue_commission_percent),
    club_admin_percent: percent(pod.club_admin_percent),
  }));
}

function requireName(input: SaveMultiPodCalculatorInput): string {
  const name = text(input.name, 160);
  if (!name) throw new GraphQLError('A calculator name is required');
  return name;
}

function requireObjectId(id: string): Types.ObjectId {
  if (!Types.ObjectId.isValid(id)) throw new GraphQLError('Calculator not found');
  return new Types.ObjectId(id);
}

export const multiPodCalculatorService = {
  /** Most recently edited first — the list is a workbench, not an archive. */
  async list() {
    const docs = await MultiPodCalculatorModel.find({}).sort({ updated_at: -1 }).limit(500);
    return docs.map(toPub);
  },

  async get(id: string) {
    const doc = await MultiPodCalculatorModel.findById(requireObjectId(id));
    return doc ? toPub(doc) : null;
  },

  async create(input: SaveMultiPodCalculatorInput, userId: string | null) {
    const doc = await MultiPodCalculatorModel.create({
      name: requireName(input),
      pods: sanitisePods(input.pods),
      created_by: userId ? new Types.ObjectId(userId) : null,
    });
    return toPub(doc);
  },

  async update(id: string, input: SaveMultiPodCalculatorInput) {
    const doc = await MultiPodCalculatorModel.findByIdAndUpdate(
      requireObjectId(id),
      { $set: { name: requireName(input), pods: sanitisePods(input.pods) } },
      { new: true }
    );
    if (!doc) throw new GraphQLError('Calculator not found');
    return toPub(doc);
  },

  async remove(id: string) {
    const res = await MultiPodCalculatorModel.deleteOne({ _id: requireObjectId(id) });
    return res.deletedCount > 0;
  },
};
