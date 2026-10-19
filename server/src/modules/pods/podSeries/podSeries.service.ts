import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { logs } from '@observability/log';
import { AppSettingsModel } from '@modules/platform/settings/settings.model';
import {
  cleanPodSeriesMaxOccurrences,
  cleanPodSeriesMaxSpanDays,
  cleanTicketDiscountMaxPct,
} from '@modules/platform/settings/settings.service';
import { scalarText } from '@modules/commerce/store/store.shared';
import { PodModel } from '../pod/pod.model';
import { podService } from '../pod/pod.service';
import { announceSlotRequest } from '../pod/pod.venue';
import { PodDraftModel } from '../pod-draft/pod-draft.model';
import { VenueSlotModel } from '@modules/venues/venueSlot/venueSlot.model';
import { venueSlotService } from '@modules/venues/venueSlot/venueSlot.service';
import { PodSeriesModel, type IPodSeriesSkip, type PodSeriesFrequency } from './podSeries.model';
import { seriesWindows, withinSpan, type SeriesWindow } from './podSeries.dates';
import { firstSeriesSlot, matchSeriesSlots, type SeriesSlotMatch } from './podSeries.slots';
import { assertMultiDateDiscountTiers, type MultiDateDiscountTier } from './podSeries.discount';
import { createSeriesParent, syncSeriesParent } from './podSeries.parent';
import { appFormat } from '@utils/app-time';

export interface SeriesPlanInput {
  pod_mode: string;
  venue_id?: string | null;
  venue_slot_id?: string | null;
  pod_date_time?: string | null;
  pod_end_date_time?: string | null;
  frequency: PodSeriesFrequency;
  /** The last moment of the host's chosen end day (ISO), in the admin zone. */
  ends_on: string;
  /** Percent off a booking of several dates; omitted means the Pod Settings default. */
  multi_date_discount_tiers?: MultiDateDiscountTier[] | null;
}

type CreatedPod = NonNullable<Awaited<ReturnType<typeof podService.createForPartner>>>;

const fail = (code: string, message: string): never => {
  throw new GraphQLError(message, { extensions: { code } });
};

async function seriesLimits() {
  const doc = await AppSettingsModel.findOne({ singleton_key: 'app' })
    .select('pod_series_max_occurrences pod_series_max_span_days pod_multi_date_discount_tiers ticket_discount_max_pct')
    .lean();
  return {
    maxOccurrences: cleanPodSeriesMaxOccurrences(doc?.pod_series_max_occurrences),
    maxSpanDays: cleanPodSeriesMaxSpanDays(doc?.pod_series_max_span_days),
    maxDiscountPct: cleanTicketDiscountMaxPct(doc?.ticket_discount_max_pct),
    defaultDiscountTiers: doc?.pod_multi_date_discount_tiers ?? [],
  };
}

const parseDate = (raw: string | null | undefined, what: string): Date => {
  const at = raw ? new Date(raw) : null;
  if (!at || Number.isNaN(at.getTime())) fail('BAD_USER_INPUT', `Pick a valid ${what}`);
  return at as Date;
};

/** Every date the plan produces, each with the slot it would book (physical)
 * or simply its window (virtual), plus why a date cannot run. */
async function planDates(plan: SeriesPlanInput) {
  const limits = await seriesLimits();
  const endsOn = parseDate(plan.ends_on, 'end date');
  const physical = plan.pod_mode !== 'VIRTUAL';
  let first: SeriesWindow;
  let slot: Awaited<ReturnType<typeof firstSeriesSlot>> | null = null;
  if (physical) {
    if (!plan.venue_slot_id) fail('BAD_USER_INPUT', 'Pick the slot for the first date');
    slot = await firstSeriesSlot(String(plan.venue_slot_id), plan.venue_id);
    first = { start: slot.start_at, end: slot.end_at };
  } else {
    first = {
      start: parseDate(plan.pod_date_time, 'start time'),
      end: plan.pod_end_date_time ? parseDate(plan.pod_end_date_time, 'end time') : null,
    };
  }
  if (endsOn.getTime() <= first.start.getTime()) {
    fail('BAD_USER_INPUT', 'The series must end after its first date');
  }
  if (!withinSpan(first.start, endsOn, limits.maxSpanDays)) {
    fail('BAD_USER_INPUT', `A recurring pod can run for at most ${limits.maxSpanDays} days`);
  }
  const windows = seriesWindows(first, plan.frequency, endsOn, limits.maxOccurrences);
  const now = Date.now();
  const matches: SeriesSlotMatch[] = slot
    ? await matchSeriesSlots(slot, windows)
    : windows.map((window) => ({ window, slotId: null, price: null, reason: null }));
  // A date already in the past cannot be booked, whatever the slot says.
  const dates = matches.map((m) =>
    m.window.start.getTime() <= now ? { ...m, slotId: null, reason: 'FAILED' as const } : m
  );
  return { limits, physical, dates };
}

/** A date's own slug — the title plus its day — so the parent keeps the title's. */
const dateSlug = (title: string, start: Date): string => `${title} ${appFormat(start, 'yyyy-MM-dd')}`;

const toPubDate = (m: SeriesSlotMatch) => ({
  start_at: m.window.start.toISOString(),
  end_at: m.window.end ? m.window.end.toISOString() : null,
  slot_id: m.slotId,
  price: m.price,
  available: !m.reason,
  reason: m.reason,
});

/** Skips a date that failed to become a pod, keeping the server's message. */
const skipOf = (m: SeriesSlotMatch, error: unknown): IPodSeriesSkip => ({
  date: m.window.start,
  reason: error instanceof GraphQLError && error.extensions?.code === 'CONFLICT' ? 'TAKEN' : 'FAILED',
  detail: error instanceof Error ? error.message.slice(0, 300) : null,
});

/** The dates that will not run: refused by the plan, or taken out by the host. */
function plannedSkips(dates: SeriesSlotMatch[], skipByHost: ReadonlySet<number>): IPodSeriesSkip[] {
  const skipped: IPodSeriesSkip[] = dates
    .filter((m) => m.reason)
    .map((m) => ({ date: m.window.start, reason: m.reason as IPodSeriesSkip['reason'] }));
  for (const m of dates.filter((d) => !d.reason && skipByHost.has(d.window.start.getTime()))) {
    skipped.push({ date: m.window.start, reason: 'REMOVED_BY_HOST' });
  }
  return skipped;
}

/** One date's pod input: the draft's fields with this date's time, slug and slot. */
function dateInputFor(input: Record<string, unknown>, m: SeriesSlotMatch, frequency: PodSeriesFrequency, physical: boolean) {
  return {
    ...input,
    pod_id: dateSlug(scalarText(input.pod_title), m.window.start),
    pod_occurrence: frequency,
    pod_date_time: m.window.start.toISOString(),
    pod_end_date_time: m.window.end ? m.window.end.toISOString() : null,
    venue_slot_id: physical ? m.slotId : null,
  };
}

/** Sends the venue ONE request message for the whole series, on its first
 * still-pending date, rather than one per date. */
async function announceSeries(podIds: Types.ObjectId[]) {
  const firstPending = await PodModel.findOne({ _id: { $in: podIds }, venue_approval_status: 'PENDING' })
    .sort({ pod_date_time: 1 });
  if (!firstPending?.venue_slot_id) return;
  const slot = await VenueSlotModel.findById(firstPending.venue_slot_id);
  if (slot) announceSlotRequest(firstPending, slot);
}

export const podSeriesService = {
  async preview(plan: SeriesPlanInput) {
    const { limits, dates } = await planDates(plan);
    return {
      frequency: plan.frequency,
      max_occurrences: limits.maxOccurrences,
      max_span_days: limits.maxSpanDays,
      max_discount_pct: limits.maxDiscountPct,
      default_multi_date_discount_tiers: limits.defaultDiscountTiers,
      dates: dates.map(toPubDate),
    };
  },

  /**
   * Publishes a draft as a recurring series: one real pod per date that can
   * run, created through the same host funnel as a one-time pod.
   *
   * The plan is recomputed here rather than trusted from the client. The FIRST
   * date is the canary — if it is refused (content, economics, the host's own
   * standing) nothing is created and the host sees why, because every other
   * date would be refused the same way. A later date that fails on its own
   * (its slot was taken a second ago) is skipped and reported, and the rest
   * still go ahead.
   */
  async publishFromDraft(
    userId: string,
    draftId: string,
    input: Record<string, unknown>,
    plan: SeriesPlanInput & { skip_dates?: string[] | null }
  ) {
    const draft = await PodDraftModel.findOne({ _id: draftId, user_id: new Types.ObjectId(userId) });
    if (!draft) fail('NOT_FOUND', 'Draft not found');
    const { limits, physical, dates } = await planDates(plan);
    const discountTiers = assertMultiDateDiscountTiers(
      plan.multi_date_discount_tiers ?? limits.defaultDiscountTiers,
      { maxPct: limits.maxDiscountPct, maxDates: limits.maxOccurrences }
    );
    const skipByHost = new Set((plan.skip_dates ?? []).map((d) => new Date(d).getTime()));
    const runnable = dates.filter((m) => !m.reason && !skipByHost.has(m.window.start.getTime()));
    if (runnable.length < 2) fail('BAD_USER_INPUT', 'A recurring pod needs at least two dates that can run');

    const series = await PodSeriesModel.create({
      host_user_id: new Types.ObjectId(userId),
      club_id: new Types.ObjectId(String(input.club_id)),
      venue_id: physical && plan.venue_id ? new Types.ObjectId(plan.venue_id) : null,
      pod_mode: physical ? 'PHYSICAL' : 'VIRTUAL',
      pod_title: scalarText(input.pod_title).trim(),
      frequency: plan.frequency,
      starts_at: runnable[0].window.start,
      ends_on: new Date(plan.ends_on),
      multi_date_discount_tiers: discountTiers,
    });
    const created: { id: Types.ObjectId; pub: CreatedPod }[] = [];
    const skipped = plannedSkips(dates, skipByHost);

    for (const [i, m] of runnable.entries()) {
      const dateInput = dateInputFor(input, m, plan.frequency, physical);
      try {
        const pub = await podService.createForPartner(userId, dateInput, {
          id: String(series._id),
          index: i + 1,
          total: runnable.length,
          quietVenue: true,
        });
        if (pub) created.push({ id: new Types.ObjectId(pub.id), pub });
      } catch (error) {
        if (created.length === 0) {
          await series.deleteOne();
          throw error;
        }
        skipped.push(skipOf(m, error));
        logs.server.warn('podSeries', 'publishFromDraft.date', { series_id: String(series._id), error });
      }
    }

    // Number the dates that exist, in order, so "2 of 11" never has a gap.
    await PodModel.bulkWrite(
      created.map((c, i) => ({
        updateOne: { filter: { _id: c.id }, update: { $set: { series_index: i + 1, series_total: created.length } } },
      }))
    );
    series.pod_ids = created.map((c) => c.id);
    series.skipped = skipped;
    series.parent_pod_id = await createSeriesParent(series._id, series.pod_ids, {
      club_id: input.club_id,
      pod_title: input.pod_title,
    });
    await series.save();
    await PodDraftModel.deleteOne({ _id: draft!._id });
    await announceSeries(series.pod_ids);
    const pods = created.map((c, i) => ({ ...c.pub, series_index: i + 1, series_total: created.length }));
    return {
      series_id: String(series._id),
      parent_pod_id: String(series.parent_pod_id),
      created_count: created.length,
      pods,
      skipped: skipped.map((s) => ({ date: s.date.toISOString(), reason: s.reason, detail: s.detail ?? null })),
    };
  },

  /** The venue answers every still-pending date of a series at once. Each date
   * goes through the ordinary per-slot approve/decline, so the same checks and
   * notifications run; a date that can no longer be answered is counted. */
  async venueDecide(ownerUserId: string, seriesId: string, approve: boolean, reason?: string | null) {
    if (!Types.ObjectId.isValid(seriesId)) fail('BAD_USER_INPUT', 'Invalid series');
    const pods = await PodModel.find({
      series_id: new Types.ObjectId(seriesId),
      venue_approval_status: 'PENDING',
      venue_slot_id: { $ne: null },
    })
      .select('venue_slot_id')
      .lean();
    let decided = 0;
    let failed = 0;
    for (const pod of pods) {
      try {
        const slotId = String(pod.venue_slot_id);
        if (approve) await venueSlotService.approveRequest(ownerUserId, slotId);
        else await venueSlotService.declineRequest(ownerUserId, slotId, reason);
        decided += 1;
      } catch (error) {
        // FORBIDDEN on the first date means this is not their venue at all.
        if (error instanceof GraphQLError && error.extensions?.code === 'FORBIDDEN') throw error;
        failed += 1;
      }
    }
    return { decided, failed };
  },

  /** The host calls off every date of the series that has not started yet.
   * Each goes through the ordinary host cancellation — refunds and messages
   * included — and the dates that already ran are left alone. */
  async hostCancelUpcoming(userId: string, seriesId: string, reasonSubject: string, reasonNote?: string | null) {
    if (!Types.ObjectId.isValid(seriesId)) fail('BAD_USER_INPUT', 'Invalid series');
    const series = await PodSeriesModel.findById(seriesId).select('host_user_id parent_pod_id').lean();
    if (!series || String(series.host_user_id) !== userId) fail('FORBIDDEN', 'Only the host can cancel this series');
    const upcoming = await PodModel.find({
      series_id: new Types.ObjectId(seriesId),
      pod_date_time: { $gt: new Date() },
    })
      .select('_id')
      .lean();
    let cancelled = 0;
    for (const pod of upcoming) {
      await podService.hostRemove(String(pod._id), userId, reasonSubject, reasonNote);
      cancelled += 1;
    }
    if (series?.parent_pod_id) await syncSeriesParent(series.parent_pod_id);
    return cancelled;
  },
};
