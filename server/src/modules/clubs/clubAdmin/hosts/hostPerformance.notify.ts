import type { NotifyInput } from '@services/notify/notify.service';
import { emailTranslationVars } from '@services/email/email-i18n';
import { contactNumber, userContactNumber } from '@utils/contact';
import { appDate } from '@utils/app-time';
import { escapeHtml } from '@utils/html';
import { podsShortOfTarget } from './hostPerformance.math';
import type { HostUserLean } from './clubHosts.models';

/**
 * The two monthly messages, built from a finished month's results.
 *
 *   HOST_MONTHLY_PERFORMANCE          each host, per club they host: the target,
 *                                     what they completed, their score and one
 *                                     line of guidance.
 *   CLUB_ADMIN_HOST_PERFORMANCE_ALERT each admin of a club with at least one host
 *                                     inactive or below the threshold: counts on
 *                                     WhatsApp, every such host with contacts,
 *                                     score and a suggested action by email.
 *
 * Each carries an entityId of `<recipient>:<club>:<YYYY-MM>`, so the notify
 * layer's per-channel slots (WaMessageLog, EmailClaim) refuse a second copy of
 * the same month however often the job is retried.
 */

export const HOST_MONTHLY_EVENT = 'HOST_MONTHLY_PERFORMANCE';
export const CLUB_ADMIN_ALERT_EVENT = 'CLUB_ADMIN_HOST_PERFORMANCE_ALERT';
/** Hosts listed in one admin email; the rest are a count and the button. */
const EMAIL_HOST_LIMIT = 25;

type UserLike = HostUserLean;

export interface HostMonthResult {
  clubId: string;
  hostId: string;
  completed: number;
  target: number;
  score: number;
  lastPodAt: Date | null;
  inactive: boolean;
  underperforming: boolean;
}

export interface ClubMonth {
  clubId: string;
  clubName: string;
  period: string;
  monthLabel: string;
  hostsUrl: string;
  createPodUrl: string;
}

const nameOf = (user?: UserLike | null) =>
  `${user?.profile?.first_name ?? ''} ${user?.profile?.last_name ?? ''}`.trim();

/** The guidance line in the host's own language: kept up, or how many more pods. */
async function guidanceFor(host: UserLike | undefined, result: HostMonthResult): Promise<string> {
  const words = await emailTranslationVars(host?.profile?.locale ?? null);
  const short = podsShortOfTarget(result.completed, result.target);
  if (short === 0) return words['t:email.hostMonthlyPerformance.guidanceMet'];
  return words['t:email.hostMonthlyPerformance.guidanceBelow'].replaceAll('{{count}}', String(short));
}

export async function hostMonthlyMessage(
  month: ClubMonth,
  result: HostMonthResult,
  host: UserLike | undefined
): Promise<NotifyInput> {
  const name = nameOf(host);
  return {
    event: HOST_MONTHLY_EVENT,
    entityId: `${result.hostId}:${month.clubId}:${month.period}`,
    user: host,
    name,
    params: [
      name,
      month.clubName,
      month.monthLabel,
      result.target,
      result.completed,
      `${result.score}%`,
      await guidanceFor(host, result),
      month.createPodUrl,
    ],
  };
}

/** One host's block in the admin email. Values are escaped; labels stay `{{t:…}}` for the reader's locale. */
function hostBlock(result: HostMonthResult, host: UserLike | undefined): string {
  const contacts = [
    userContactNumber(host),
    contactNumber(host?.communication?.whatsapp?.extension, host?.communication?.whatsapp?.number),
    host?.auth?.email ?? null,
  ]
    .filter((value): value is string => Boolean(value))
    .map(escapeHtml)
    .join(' · ');
  const lastPod = result.lastPodAt ? escapeHtml(appDate(result.lastPodAt)) : '{{t:email.hostPerformance.noPodYet}}';
  const action = result.inactive ? 'email.hostPerformance.actionInactive' : 'email.hostPerformance.actionBelow';
  return [
    `<p><strong>${escapeHtml(nameOf(host) || '—')}</strong><br/>`,
    `{{t:email.hostPerformance.score}}: ${result.score}% (${result.completed}/${result.target})<br/>`,
    `{{t:email.hostPerformance.lastPod}}: ${lastPod}<br/>`,
    `{{t:email.hostPerformance.contact}}: ${contacts || '—'}<br/>`,
    `<em>{{t:${action}}}</em></p>`,
  ].join('');
}

/** The admin email's host list, inactive hosts first. */
export function attentionHtml(results: readonly HostMonthResult[], users: Map<string, UserLike>): string {
  const ordered = [...results].sort((a, b) => Number(b.inactive) - Number(a.inactive) || a.score - b.score);
  const shown = ordered.slice(0, EMAIL_HOST_LIMIT).map((r) => hostBlock(r, users.get(r.hostId)));
  const rest = ordered.length - shown.length;
  if (rest > 0) shown.push(`<p>{{t:email.hostPerformance.moreHosts}} ${rest}</p>`);
  return shown.join('');
}

export function clubAdminAlertMessage(
  month: ClubMonth,
  attention: readonly HostMonthResult[],
  admin: UserLike | undefined,
  users: Map<string, UserLike>
): NotifyInput {
  const name = nameOf(admin);
  return {
    event: CLUB_ADMIN_ALERT_EVENT,
    entityId: `${String(admin?._id ?? '')}:${month.clubId}:${month.period}`,
    user: admin,
    name,
    params: [
      name,
      month.clubName,
      month.monthLabel,
      attention.length,
      attention.filter((r) => r.inactive).length,
      attention.filter((r) => r.underperforming).length,
      month.hostsUrl,
    ],
    vars: {
      target: String(attention[0]?.target ?? ''),
      hosts_html: attentionHtml(attention, users),
    },
  };
}
