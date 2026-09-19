/**
 * Marketing → Social Accounts: the vocabulary every file in this module shares.
 *
 * A PROVIDER is the app a marketer connects through; a PLATFORM is the network
 * an account lives on. They differ only for Meta, where one Facebook login
 * hands back both the Facebook Pages and the Instagram Business accounts
 * behind them.
 */

export const SOCIAL_PROVIDERS = ['LINKEDIN', 'META', 'X', 'YOUTUBE'] as const;
export type SocialProvider = (typeof SOCIAL_PROVIDERS)[number];

export const SOCIAL_PLATFORMS = ['LINKEDIN', 'FACEBOOK', 'INSTAGRAM', 'X', 'YOUTUBE'] as const;
export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number];

/** EXPIRED needs a person to reconnect; ERROR is retried on the next sync. */
export const SOCIAL_ACCOUNT_STATUSES = ['CONNECTED', 'EXPIRED', 'ERROR'] as const;
export type SocialAccountStatus = (typeof SOCIAL_ACCOUNT_STATUSES)[number];

export const SOCIAL_AI_STATUSES = ['PENDING', 'CLEAN', 'FLAGGED'] as const;
export type SocialAiStatus = (typeof SOCIAL_AI_STATUSES)[number];

export const SOCIAL_SENTIMENTS = ['POSITIVE', 'NEUTRAL', 'NEGATIVE'] as const;
export type SocialSentiment = (typeof SOCIAL_SENTIMENTS)[number];

export const SOCIAL_SEVERITIES = ['LOW', 'MEDIUM', 'HIGH'] as const;
export type SocialSeverity = (typeof SOCIAL_SEVERITIES)[number];

export const SOCIAL_REVIEW_STATUSES = ['OPEN', 'REVIEWED'] as const;
export type SocialReviewStatus = (typeof SOCIAL_REVIEW_STATUSES)[number];

/** A post written in Duncit: a draft, waiting for its time, going out, or out. */
export const SOCIAL_PUBLISH_STATUSES = ['DRAFT', 'SCHEDULED', 'PUBLISHING', 'PUBLISHED', 'PARTIAL', 'FAILED'] as const;
export type SocialPublishStatus = (typeof SOCIAL_PUBLISH_STATUSES)[number];

/** One network a post is going to — each succeeds or fails on its own. */
export const SOCIAL_TARGET_STATUSES = ['PENDING', 'PUBLISHED', 'FAILED'] as const;
export type SocialTargetStatus = (typeof SOCIAL_TARGET_STATUSES)[number];

export const SOCIAL_MEDIA_TYPES = ['IMAGE', 'VIDEO'] as const;
export type SocialMediaType = (typeof SOCIAL_MEDIA_TYPES)[number];

export const SOCIAL_IDEA_STATUSES = ['NEW', 'USED', 'DISMISSED'] as const;
export type SocialIdeaStatus = (typeof SOCIAL_IDEA_STATUSES)[number];

export const SOCIAL_IDEA_FORMATS = ['TEXT', 'IMAGE', 'VIDEO'] as const;
export type SocialIdeaFormat = (typeof SOCIAL_IDEA_FORMATS)[number];

/** One provider app, as Tech configured it under Environment Variables → Social apps. */
export interface SocialAppCredentials {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  /** LinkedIn's `LinkedIn-Version` header or Meta's Graph version; '' for the others. */
  version: string;
}

export interface SocialTokens {
  access_token: string;
  refresh_token: string;
  /** Null for a token that does not expire (a Facebook Page token). */
  expires_at: Date | null;
  scopes: string[];
}

/** An account a finished OAuth handshake handed back, ready to be stored. */
export interface DiscoveredAccount {
  platform: SocialPlatform;
  external_id: string;
  name: string;
  handle: string;
  avatar_url: string;
  profile_url: string;
  followers: number;
  tokens: SocialTokens;
  /** Per-platform ids a reader needs later (a channel's uploads playlist). */
  meta: Record<string, string>;
}

/** What a reader needs of a stored account — its tokens included. */
export interface SocialAccountHandle {
  platform: SocialPlatform;
  external_id: string;
  handle: string;
  access_token: string;
  refresh_token: string;
  meta: Record<string, string>;
}

export interface FetchedProfile {
  name: string;
  handle: string;
  avatar_url: string;
  followers: number;
}

export interface FetchedPost {
  external_id: string;
  text: string;
  media_url: string;
  permalink: string;
  published_at: Date;
  likes: number;
  comments: number;
  shares: number;
  /** Null where the network does not report views to this app. */
  views: number | null;
}

export interface FetchedComment {
  external_id: string;
  author_name: string;
  author_handle: string;
  text: string;
  permalink: string;
  published_at: Date;
  likes: number;
}

/** The post a comment read is about. */
export interface PostRef {
  external_id: string;
  permalink: string;
}

/** The OAuth half of a provider: the consent screen and the code exchange. */
export interface SocialConnector {
  authorizeUrl(input: { creds: SocialAppCredentials; state: string; challenge: string }): string;
  connect(input: { code: string; creds: SocialAppCredentials; verifier: string }): Promise<DiscoveredAccount[]>;
}

/** What a post carries to every network it goes to. */
export interface PublishContent {
  text: string;
  /** '' for a text-only post. */
  media_url: string;
  media_type: SocialMediaType | null;
}

export interface PublishResult {
  external_id: string;
  permalink: string;
}

/** The writing half of a platform. */
export interface SocialPublisher {
  publish(account: SocialAccountHandle, content: PublishContent, creds: SocialAppCredentials): Promise<PublishResult>;
}

/** One provider app's keys, judged by the provider without a person signing in. */
export interface ProbeOutcome {
  ok: boolean;
  message: string;
}

/** The reading half of a platform. */
export interface SocialReader {
  /** How far back replies can be read at all (X search covers seven days). */
  commentWindowDays?: number;
  /** Only for tokens that expire and can be renewed without a person. */
  refresh?(account: SocialAccountHandle, creds: SocialAppCredentials): Promise<SocialTokens>;
  profile(account: SocialAccountHandle, creds: SocialAppCredentials): Promise<FetchedProfile>;
  posts(account: SocialAccountHandle, creds: SocialAppCredentials): Promise<FetchedPost[]>;
  comments(account: SocialAccountHandle, post: PostRef, creds: SocialAppCredentials): Promise<FetchedComment[]>;
}
