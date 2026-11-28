import type { SocialPlatform, SocialWindowState } from './social.types';

/**
 * Meta's messaging window, the one rule every direct message from Duncit
 * passes through on the server (never only in the UI):
 *
 * - within 24 hours of the person's last message, any reply may go — RESPONSE;
 * - from 24 hours to 7 days, only a PERSON may reply, on the HUMAN_AGENT tag —
 *   and only when Settings' human_agent_replies is on, because Meta refuses
 *   the tag from an app it has not approved for it; an automation never may;
 * - otherwise (past 24 hours without the tag, past 7 days, or to someone who
 *   never wrote at all) nothing goes: the conversation is CLOSED and the
 *   Inbox says why before anyone types. Duncit sends no cold DM through the
 *   API — cold outreach stays hand-sent from the Instagram app (Instagram
 *   Leads, Sequences' DM tasks).
 */
export const STANDARD_WINDOW_MS = 24 * 60 * 60_000;
export const HUMAN_AGENT_WINDOW_MS = 7 * 24 * 60 * 60_000;

export interface MessagingWindow {
  state: SocialWindowState;
  /** When the current state ends; null once closed. */
  closes_at: Date | null;
}

/** `humanAgent` is Settings' human_agent_replies; without it the window ends at 24 hours. */
export function messagingWindow(lastInboundAt: Date | string | null | undefined, now = Date.now(), humanAgent = true): MessagingWindow {
  const last = lastInboundAt ? new Date(lastInboundAt).getTime() : Number.NaN;
  if (!Number.isFinite(last)) return { state: 'CLOSED', closes_at: null };
  const age = now - last;
  if (age < STANDARD_WINDOW_MS) return { state: 'OPEN', closes_at: new Date(last + STANDARD_WINDOW_MS) };
  if (humanAgent && age < HUMAN_AGENT_WINDOW_MS) return { state: 'HUMAN_AGENT', closes_at: new Date(last + HUMAN_AGENT_WINDOW_MS) };
  return { state: 'CLOSED', closes_at: null };
}

/** How a send goes out under the window, or null when it may not go at all. */
export interface SendTerms {
  messaging_type: 'RESPONSE' | 'MESSAGE_TAG';
  tag: '' | 'HUMAN_AGENT';
}

export function sendTerms(window: MessagingWindow, byAutomation: boolean): SendTerms | null {
  if (window.state === 'OPEN') return { messaging_type: 'RESPONSE', tag: '' };
  if (window.state === 'HUMAN_AGENT' && !byAutomation) return { messaging_type: 'MESSAGE_TAG', tag: 'HUMAN_AGENT' };
  return null;
}

/** The longest direct message each network takes, and the permission sending one needs. */
export const DM_LIMIT: Readonly<Partial<Record<SocialPlatform, number>>> = { INSTAGRAM: 1000, FACEBOOK: 2000 };
export const DM_PERMISSION: Readonly<Partial<Record<SocialPlatform, string>>> = {
  INSTAGRAM: 'instagram_manage_messages',
  FACEBOOK: 'pages_messaging',
};

/** The account's missing messaging permission, or null. A Facebook Login token always reports its scopes, so an empty list is a missing one. */
export function missingDmPermission(account: { platform: SocialPlatform; scopes?: string[] | null }): string | null {
  const permission = DM_PERMISSION[account.platform];
  if (!permission) return 'messaging';
  return (account.scopes ?? []).includes(permission) ? null : permission;
}
