/**
 * Cancellation risk — the auto-cancel sweep's verdict BEFORE it acts.
 *
 * `pod.autoCancel.ts` cancels a finance-negative pod once it is inside the
 * lead window. By then it is too late for anybody to fix it. This module runs
 * the same settlement waterfall earlier — inside the wider RISK window from
 * Admin > Pods > Pod Settings — and turns the answer into three things:
 *
 *   - a flag on the pod document (`cancellation_risk`), so the admin pods table
 *     can tint the row red without running a waterfall per row;
 *   - a live, fully explained view (`podCancellationRisk`) for the admin pod
 *     detail page: the money, the seats, and what would close the gap;
 *   - repeat alerts to the host and the club admins, every
 *     `pod_cancel_risk_alert_hours`, over WhatsApp and email, naming the
 *     shortfall, the bookings that would cover it and the moment the sweep
 *     would cancel the pod.
 *
 * ONE assessment (`assessPodCancellationRisk`) feeds all three, and the cancel
 * sweep reads its finance half too — two places computing "is this pod
 * negative" would be two places to disagree about the host's money.
 *
 * Risk is only ever raised while auto-cancel is ON: with the switch off there
 * is no cancellation to be at risk of, and a red row would be a lie.
 */
import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { PodModel, type IPodCancellationRisk } from './pod.model';
import { podLifecycleFilter } from './pod.lifecycle';
import { podSeatsAvailable, podSeatsTaken } from './pod.seats';
import { loadPodClubSlugMap, podNotificationLink } from './pod.service';
import { ClubModel } from '@modules/clubs/club/club.model';
import { UserModel } from '@modules/access/user/user.model';
import { VenueModel } from '@modules/venues/venue/venue.model';
import { settingsService } from '@modules/platform/settings/settings.service';
import { getFinanceSettings } from '@modules/finance/finance/finance.model';
import type { BreakdownRates } from '@modules/finance/finance/breakdown.math';
import {
  collectedForPod,
  resolveEffectiveRates,
  venueAmountForPod,
  waterfallForAmount,
  type SettlementWaterfall,
} from '@modules/finance/finance/settlement.service';
import { podImageAssets } from '@modules/platform/whatsapp/whatsapp.assets';
import { notifyEach, type NotifyInput } from '@services/notify/notify.service';
import { emailTranslationVars, recipientLocale } from '@services/email/email-i18n';
import { getUrlConfigs } from '@config/url-configs';
import { appDate, appDateTime, appTime } from '@utils/app-time';
import { trimTrailingSlash } from '@utils/url';
import { logs } from '@observability/log';

const HOUR_MS = 60 * 60 * 1000;
/** How many extra bookings an UNLIMITED pod is searched for before giving up. */
const UNLIMITED_SEARCH_CAP = 200;

const round2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

/* ------------------------------------------------------------------ *
 * The assessment
 * ------------------------------------------------------------------ */

/** The money side of one pod, as of now — what the cancel sweep decides on. */
export interface PodFinanceNow {
  collected: number;
  venueAmount: number;
  rates: BreakdownRates | null;
  waterfall: SettlementWaterfall | null;
  /** True when completing the pod would settle the host below ₹0. */
  negative: boolean;
}

/**
 * The live host side for a pod: the unclamped waterfall the Finance breakdown
 * shows. A pod with no committed venue cost cannot fall short of it, so it
 * skips the two reads the waterfall needs.
 */
export async function podFinanceNow(pod: any): Promise<PodFinanceNow> {
  const venueAmount = await venueAmountForPod(pod, 0);
  if (venueAmount <= 0) {
    return { collected: 0, venueAmount, rates: null, waterfall: null, negative: false };
  }
  const [collected, rates] = await Promise.all([
    collectedForPod(pod._id),
    resolveEffectiveRates({
      hostUserId: pod.pod_hosts_id?.[0] ?? null,
      venueId: pod.venue_id ?? null,
    }),
  ]);
  const waterfall = waterfallForAmount(collected, venueAmount, rates, {
    clampVenueToPool: false,
  });
  return { collected, venueAmount, rates, waterfall, negative: waterfall.host_receives < 0 };
}

/**
 * How many more bookings, at the pod's current ticket price, would lift the
 * host side back to ₹0. Null when bookings alone cannot: a free pod earns
 * nothing per seat, and a pod that would need more seats than it has left is
 * a pod whose venue slot or ticket price has to change instead.
 */
export function spotsNeededToCover(
  finance: PodFinanceNow,
  ticketPrice: number,
  seatsAvailable: number,
  unlimited: boolean
): number | null {
  if (!finance.negative || !finance.rates || ticketPrice <= 0) return null;
  const cap = unlimited ? UNLIMITED_SEARCH_CAP : seatsAvailable;
  for (let extra = 1; extra <= cap; extra += 1) {
    const next = waterfallForAmount(
      finance.collected + extra * ticketPrice,
      finance.venueAmount,
      finance.rates,
      { clampVenueToPool: false }
    );
    if (next.host_receives >= 0) return extra;
  }
  return null;
}

export type PodCancellationRiskState =
  | 'AT_RISK'
  | 'HEALTHY'
  | 'AUTO_CANCEL_OFF'
  | 'NO_VENUE_COST'
  | 'NOT_UPCOMING'
  | 'OUTSIDE_WINDOW';

export interface PodCancellationRiskAssessment {
  state: PodCancellationRiskState;
  at_risk: boolean;
  hours_until_start: number;
  finance: PodFinanceNow;
  shortfall: number;
  booked_seats: number;
  total_spots: number;
  seats_available: number;
  ticket_price: number;
  spots_needed: number | null;
}

type AutoCancelSettings = Awaited<ReturnType<typeof settingsService.getPodAutoCancelSettings>>;

const isUpcoming = (pod: any, now: number): boolean =>
  !pod.deleted_at &&
  !pod.completed_at &&
  !!pod.is_active &&
  new Date(pod.pod_date_time).getTime() > now;

/**
 * The whole verdict for one pod document. The state names WHY a pod is not at
 * risk, so the detail page can say "auto-cancel is off" rather than showing a
 * green tick over a pod nobody is checking.
 */
export async function assessPodCancellationRisk(
  pod: any,
  settings: AutoCancelSettings,
  now: number
): Promise<PodCancellationRiskAssessment> {
  const hoursUntilStart = (new Date(pod.pod_date_time).getTime() - now) / HOUR_MS;
  const seats = {
    booked_seats: podSeatsTaken(pod),
    total_spots: pod.no_of_spots ?? 0,
    seats_available: podSeatsAvailable(pod),
    ticket_price: pod.pod_amount ?? 0,
  };
  const idle = (state: PodCancellationRiskState, finance: PodFinanceNow) => ({
    state,
    at_risk: false,
    hours_until_start: hoursUntilStart,
    finance,
    shortfall: 0,
    ...seats,
    spots_needed: null,
  });
  const noFinance: PodFinanceNow = {
    collected: 0,
    venueAmount: 0,
    rates: null,
    waterfall: null,
    negative: false,
  };
  if (!settings.enabled) return idle('AUTO_CANCEL_OFF', noFinance);
  if (!isUpcoming(pod, now)) return idle('NOT_UPCOMING', noFinance);

  const finance = await podFinanceNow(pod);
  if (finance.venueAmount <= 0) return idle('NO_VENUE_COST', finance);
  if (hoursUntilStart > settings.risk_window_hours) return idle('OUTSIDE_WINDOW', finance);
  if (!finance.negative) return idle('HEALTHY', finance);

  return {
    state: 'AT_RISK',
    at_risk: true,
    hours_until_start: hoursUntilStart,
    finance,
    shortfall: round2(-(finance.waterfall?.host_receives ?? 0)),
    ...seats,
    spots_needed: spotsNeededToCover(
      finance,
      seats.ticket_price,
      seats.seats_available,
      seats.total_spots <= 0
    ),
  };
}

/** The instant the auto-cancel lead window opens for a pod — when the sweep
 * cancels it if it is still negative. */
export const podCancelAt = (pod: any, leadHours: number): Date =>
  new Date(new Date(pod.pod_date_time).getTime() - leadHours * HOUR_MS);

/* ------------------------------------------------------------------ *
 * The live view (admin pod detail page)
 * ------------------------------------------------------------------ */

const RISK_POD_FIELDS =
  'pod_id pod_title pod_hosts_id venue_id venue_slot_id club_id pod_date_time completed_at deleted_at ' +
  'is_active pod_attendees extra_seats no_of_spots pod_amount pod_images_and_videos cancellation_risk';

/** An empty waterfall for the states that never ran one, so the GraphQL type
 * can stay non-null and the client never branches on a missing object. */
const EMPTY_WATERFALL: SettlementWaterfall = {
  version: 0,
  amount: 0,
  gst_pct: 0,
  gst_amount: 0,
  net_amount: 0,
  platform_fee_pct: 0,
  platform_fee_amount: 0,
  pool_amount: 0,
  club_admin_pct: 0,
  club_admin_amount: 0,
  venue_amount: 0,
  venue_commission_pct: 0,
  venue_commission_amount: 0,
  venue_receives: 0,
  host_amount: 0,
  host_commission_pct: 0,
  host_commission_amount: 0,
  host_receives: 0,
  duncit_revenue: 0,
  host_earn_pct: 0,
};

const iso = (value: Date | null | undefined): string | null =>
  value ? new Date(value).toISOString() : null;

/** The full picture for one pod, computed live — the admin detail section. */
export async function podCancellationRisk(podDocId: string) {
  if (!Types.ObjectId.isValid(podDocId)) {
    throw new GraphQLError('Invalid pod', { extensions: { code: 'BAD_USER_INPUT' } });
  }
  const pod: any = await PodModel.findById(podDocId)
    .select(RISK_POD_FIELDS)
    .setOptions({ includeDeleted: true })
    .lean();
  if (!pod) throw new GraphQLError('Pod not found', { extensions: { code: 'NOT_FOUND' } });

  const now = Date.now();
  const [settings, financeSettings] = await Promise.all([
    settingsService.getPodAutoCancelSettings(),
    getFinanceSettings(),
  ]);
  const assessment = await assessPodCancellationRisk(pod, settings, now);
  const stored: IPodCancellationRisk | null = pod.cancellation_risk ?? null;
  const alertedAt = stored?.alerted_at ? new Date(stored.alerted_at) : null;
  const nextAlertAt =
    assessment.at_risk && alertedAt
      ? new Date(alertedAt.getTime() + settings.risk_alert_hours * HOUR_MS)
      : null;

  return {
    pod_id: String(pod._id),
    state: assessment.state,
    at_risk: assessment.at_risk,
    hours_until_start: round2(assessment.hours_until_start),
    lead_hours: settings.lead_hours,
    window_hours: settings.risk_window_hours,
    alert_hours: settings.risk_alert_hours,
    cancel_at: assessment.at_risk ? podCancelAt(pod, settings.lead_hours).toISOString() : null,
    currency_symbol: financeSettings.currency_symbol,
    collected_total: assessment.finance.collected,
    venue_amount: assessment.finance.venueAmount,
    shortfall: assessment.shortfall,
    waterfall: assessment.finance.waterfall ?? EMPTY_WATERFALL,
    attendees: {
      booked_seats: assessment.booked_seats,
      total_spots: assessment.total_spots,
      seats_available: assessment.seats_available,
      ticket_price: assessment.ticket_price,
      spots_needed: assessment.spots_needed,
    },
    alerted_at: iso(alertedAt),
    alert_count: stored?.alert_count ?? 0,
    next_alert_at: iso(nextAlertAt),
  };
}

/* ------------------------------------------------------------------ *
 * The sweep: flag, clear, alert
 * ------------------------------------------------------------------ */

type UserLike = Record<string, any>;

/** Recipients with the paths the WhatsApp funnel reads the number off, plus
 * `auth.email` so the email leg has an address — the same projection the
 * WhatsApp scheduler uses, for the same reason. */
async function recipients(ids: readonly unknown[]): Promise<Map<string, UserLike>> {
  const unique = [...new Set(ids.map(String).filter(Boolean))];
  if (unique.length === 0) return new Map();
  const users = await UserModel.find({ _id: { $in: unique } })
    .select('profile.first_name profile.last_name auth.email auth.phone communication.whatsapp')
    .lean();
  return new Map(users.map((user: any) => [String(user._id), user]));
}

const nameOf = (user?: UserLike | null) =>
  `${user?.profile?.first_name ?? ''} ${user?.profile?.last_name ?? ''}`.trim() || 'there';

/** The "bookings needed" phrase in the recipient's own language — a count, or
 * the sentence that says bookings alone cannot close the gap. */
async function bookingsNeededFor(user: UserLike | undefined, spotsNeeded: number | null) {
  const locale = user?.auth?.email ? await recipientLocale(String(user.auth.email)) : null;
  const words = await emailTranslationVars(locale);
  if (spotsNeeded === null) return words['t:email.podCancellationRisk.cannotCover'];
  return words['t:email.podCancellationRisk.bookingsNeededCount'].replaceAll(
    '{{count}}',
    String(spotsNeeded)
  );
}

interface AlertContext {
  pod: any;
  assessment: PodCancellationRiskAssessment;
  alertNo: number;
  symbol: string;
  cancelAt: Date;
  hostLink: string;
  clubAdminLink: string;
  venueName: string;
  hostName: string;
}

const money = (symbol: string, amount: number) => `${symbol}${round2(amount)}`;

/** The email-only values both audiences' templates print under the callout. */
const detailVars = (ctx: AlertContext): Record<string, string> => ({
  venue: ctx.venueName,
  collected: money(ctx.symbol, ctx.assessment.finance.collected),
  venue_cost: money(ctx.symbol, ctx.assessment.finance.venueAmount),
  spots:
    ctx.assessment.total_spots > 0
      ? `${ctx.assessment.booked_seats} / ${ctx.assessment.total_spots}`
      : String(ctx.assessment.booked_seats),
});

async function hostAlert(ctx: AlertContext, host: UserLike | undefined): Promise<NotifyInput> {
  const name = nameOf(host);
  return {
    event: 'HOST_POD_CANCELLATION_RISK',
    entityId: `${String(ctx.pod._id)}:${ctx.alertNo}`,
    user: host,
    name,
    assets: podImageAssets(ctx.pod.pod_images_and_videos),
    params: [
      name,
      ctx.pod.pod_title,
      appDate(ctx.pod.pod_date_time),
      appTime(ctx.pod.pod_date_time),
      money(ctx.symbol, ctx.assessment.shortfall),
      await bookingsNeededFor(host, ctx.assessment.spots_needed),
      appDateTime(ctx.cancelAt),
      ctx.hostLink,
    ],
    vars: detailVars(ctx),
  };
}

async function clubAdminAlert(
  ctx: AlertContext,
  admin: UserLike | undefined
): Promise<NotifyInput> {
  const name = nameOf(admin);
  return {
    event: 'CLUB_ADMIN_POD_CANCELLATION_RISK',
    entityId: `${String(ctx.pod._id)}:${ctx.alertNo}`,
    user: admin,
    name,
    assets: podImageAssets(ctx.pod.pod_images_and_videos),
    params: [
      name,
      ctx.pod.pod_title,
      appDate(ctx.pod.pod_date_time),
      appTime(ctx.pod.pod_date_time),
      ctx.hostName,
      money(ctx.symbol, ctx.assessment.shortfall),
      await bookingsNeededFor(admin, ctx.assessment.spots_needed),
      appDateTime(ctx.cancelAt),
      ctx.clubAdminLink,
    ],
    vars: detailVars(ctx),
  };
}

/**
 * Claim this alert round. A conditional update rather than a read-then-write:
 * the stamp is what makes "every N hours" hold across ticks, and it must be
 * taken before a single message goes out so a tick that dies mid-fan-out
 * cannot repeat the round. Returns the round number, or null when the last
 * round is still fresh.
 */
async function claimAlertRound(podId: unknown, now: number, alertHours: number) {
  const claimed: any = await PodModel.findOneAndUpdate(
    {
      _id: podId,
      'cancellation_risk.at_risk': true,
      $or: [
        { 'cancellation_risk.alerted_at': null },
        { 'cancellation_risk.alerted_at': { $lte: new Date(now - alertHours * HOUR_MS) } },
      ],
    },
    {
      $set: { 'cancellation_risk.alerted_at': new Date(now) },
      $inc: { 'cancellation_risk.alert_count': 1 },
    },
    { new: true }
  )
    .select('cancellation_risk.alert_count')
    .lean();
  return claimed ? Number(claimed.cancellation_risk?.alert_count ?? 1) : null;
}

/** Host + every admin of the pod's club, on both channels, one round. */
async function alertPodAtRisk(
  pod: any,
  assessment: PodCancellationRiskAssessment,
  settings: AutoCancelSettings,
  now: number,
  symbol: string
): Promise<boolean> {
  const alertNo = await claimAlertRound(pod._id, now, settings.risk_alert_hours);
  if (alertNo === null) return false;

  const [club, venue, urls, slugById] = await Promise.all([
    pod.club_id ? ClubModel.findById(pod.club_id).select('admin_user_ids').lean() : null,
    pod.venue_id ? VenueModel.findById(pod.venue_id).select('venue_name').lean() : null,
    getUrlConfigs(),
    loadPodClubSlugMap([pod]),
  ]);
  const hostIds: string[] = (pod.pod_hosts_id ?? []).map(String);
  const adminIds: string[] = ((club as any)?.admin_user_ids ?? []).map(String);
  const users = await recipients([...hostIds, ...adminIds]);
  const path = podNotificationLink(pod, slugById);
  const ctx: AlertContext = {
    pod,
    assessment,
    alertNo,
    symbol,
    cancelAt: podCancelAt(pod, settings.lead_hours),
    hostLink: path ? `${trimTrailingSlash(urls.mwebUrl)}${path}` : '',
    clubAdminLink: `${trimTrailingSlash(urls.partnersUrl)}/club-admin/clubs/${String(pod.club_id)}/pods/${String(pod._id)}`,
    venueName: (venue as any)?.venue_name ?? '',
    hostName: nameOf(users.get(hostIds[0] ?? '')),
  };
  const inputs = await Promise.all([
    ...hostIds.map((id) => hostAlert(ctx, users.get(id))),
    ...adminIds.map((id) => clubAdminAlert(ctx, users.get(id))),
  ]);
  await notifyEach(inputs);
  logs.server.info('pod-cancel-risk', 'alert', {
    pod_id: String(pod._id),
    round: alertNo,
    recipients: inputs.length,
    shortfall: assessment.shortfall,
    msg: 'cancellation-risk alert round sent',
  });
  return true;
}

/** Persist a verdict. Only the verdict fields: the alert stamps are the
 * claim's to write, and a `$set` of the whole subdocument would wipe them. */
async function flagPod(pod: any, assessment: PodCancellationRiskAssessment, now: number) {
  const stored: IPodCancellationRisk | null = pod.cancellation_risk ?? null;
  await PodModel.updateOne(
    { _id: pod._id },
    {
      $set: {
        'cancellation_risk.at_risk': true,
        'cancellation_risk.evaluated_at': new Date(now),
        'cancellation_risk.shortfall': assessment.shortfall,
        'cancellation_risk.spots_needed': assessment.spots_needed,
        'cancellation_risk.alerted_at': stored?.alerted_at ?? null,
        'cancellation_risk.alert_count': stored?.alert_count ?? 0,
      },
    }
  );
}

/**
 * One sweep: every live UPCOMING pod with a venue, starting inside the risk
 * window — flag the negative ones, clear the rest, alert where a round is due.
 * Exported so it can be run on demand. Returns what it did.
 */
export async function runPodCancellationRiskSweep(): Promise<{ flagged: number; alerted: number }> {
  const settings = await settingsService.getPodAutoCancelSettings();
  const now = Date.now();
  const atRisk: Types.ObjectId[] = [];
  let alerted = 0;

  if (settings.enabled) {
    const { currency_symbol } = await getFinanceSettings();
    const cursor = PodModel.find({
      ...podLifecycleFilter('UPCOMING', new Date(now)),
      is_active: true,
      venue_id: { $ne: null },
      pod_date_time: {
        $gt: new Date(now),
        $lte: new Date(now + settings.risk_window_hours * HOUR_MS),
      },
    })
      .select(RISK_POD_FIELDS)
      .sort({ pod_date_time: 1 })
      .lean()
      .cursor();

    for await (const pod of cursor) {
      try {
        const assessment = await assessPodCancellationRisk(pod, settings, now);
        if (!assessment.at_risk) continue;
        atRisk.push(pod._id as Types.ObjectId);
        await flagPod(pod, assessment, now);
        if (await alertPodAtRisk(pod, assessment, settings, now, currency_symbol)) alerted += 1;
      } catch (error) {
        // One pod's failure never aborts the sweep — the next tick retries it.
        logs.server.error('pod-cancel-risk', 'assess', {
          error,
          pod_id: String(pod._id),
          msg: 'cancellation-risk evaluation failed',
        });
      }
    }
  }

  // Everything still carrying a flag that this pass did not confirm — healthy
  // again, left the window, started, got cancelled, or auto-cancel was switched
  // off — is cleared in one write. An absent field is what "no risk" reads as.
  await PodModel.updateMany(
    { 'cancellation_risk.at_risk': true, _id: { $nin: atRisk } },
    { $unset: { cancellation_risk: 1 } }
  ).setOptions({ includeDeleted: true });

  return { flagged: atRisk.length, alerted };
}
