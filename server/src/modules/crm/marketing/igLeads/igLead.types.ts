/**
 * Marketing → Instagram Leads: business and creator profiles found from a
 * plain-language brief, scored by the AI, and worked by hand — the marketer
 * sends every DM from Instagram itself, so the account never trips the
 * automation limits that get a sender banned.
 */
export const IG_LEAD_STATUSES = ['NEW', 'CONTACTED', 'REPLIED', 'CONVERTED', 'LOST'] as const;
export type IgLeadStatus = (typeof IG_LEAD_STATUSES)[number];

/** A lead in one of these has a conversation that is over — no more follow-ups. */
export const CLOSED_STATUSES: readonly IgLeadStatus[] = ['REPLIED', 'CONVERTED', 'LOST'];

export const IG_LEAD_SEARCH_STATUSES = ['RUNNING', 'DONE', 'FAILED'] as const;
export type IgLeadSearchStatus = (typeof IG_LEAD_SEARCH_STATUSES)[number];

/** The settings' own bounds — the API refuses anything outside them. */
export const SETTINGS_LIMITS = {
  max_follow_ups: { min: 0, max: 10 },
  follow_up_gap_days: { min: 1, max: 30 },
  daily_send_limit: { min: 1, max: 100 },
  pitch: { max: 1000 },
} as const;

export const SEARCH_LIMITS = {
  brief: { min: 10, max: 500 },
  max_results: { min: 5, max: 50, default: 20 },
} as const;

/** One profile as Instagram's Business Discovery describes it. */
export interface DiscoveredProfile {
  username: string;
  name: string;
  bio: string;
  website: string;
  followers: number | null;
  follows: number | null;
  media_count: number | null;
  profile_picture_url: string;
}

/** What the AI made of the brief: the searches to run and the follower range asked for. */
export interface SearchPlan {
  summary: string;
  queries: string[];
  min_followers: number | null;
  max_followers: number | null;
}
