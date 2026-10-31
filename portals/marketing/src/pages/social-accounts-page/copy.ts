import type {
  SocialAccountStatus,
  SocialAiStatus,
  SocialPlatform,
  SocialProvider,
  SocialReviewStatus,
  SocialSentiment,
  SocialSeverity,
} from './queries';
import type {
  SocialIdeaFormat,
  SocialIdeaStatus,
  SocialPublishStatus,
  SocialQueueView,
  SocialTargetStatus,
} from './publish.queries';

/**
 * Every enum the page renders, mapped to its Localization key. The keys are
 * written out in full — never assembled from the enum — so the translation
 * gate can see that each one is used.
 */

/** One app per network, in the order the page lists them. */
export const PROVIDERS: readonly SocialProvider[] = ['INSTAGRAM', 'FACEBOOK', 'THREADS', 'YOUTUBE', 'LINKEDIN', 'X'];

export const PROVIDER_LABEL: Record<SocialProvider, string> = {
  INSTAGRAM: 'marketing.social.providerInstagram',
  FACEBOOK: 'marketing.social.providerFacebook',
  THREADS: 'marketing.social.providerThreads',
  YOUTUBE: 'marketing.social.providerYoutube',
  LINKEDIN: 'marketing.social.providerLinkedin',
  X: 'marketing.social.providerX',
};

/** What connecting the provider adds. */
export const PROVIDER_ADDS: Record<SocialProvider, string> = {
  INSTAGRAM: 'marketing.social.addsInstagram',
  FACEBOOK: 'marketing.social.addsFacebook',
  THREADS: 'marketing.social.addsThreads',
  YOUTUBE: 'marketing.social.addsYoutube',
  LINKEDIN: 'marketing.social.addsLinkedin',
  X: 'marketing.social.addsX',
};

export const PLATFORMS: readonly SocialPlatform[] = ['INSTAGRAM', 'FACEBOOK', 'THREADS', 'YOUTUBE', 'LINKEDIN', 'X'];

export const PLATFORM_LABEL: Record<SocialPlatform, string> = {
  INSTAGRAM: 'marketing.social.platformInstagram',
  FACEBOOK: 'marketing.social.platformFacebook',
  THREADS: 'marketing.social.platformThreads',
  YOUTUBE: 'marketing.social.platformYoutube',
  LINKEDIN: 'marketing.social.platformLinkedin',
  X: 'marketing.social.platformX',
};

export const STATUS_LABEL: Record<SocialAccountStatus, string> = {
  CONNECTED: 'marketing.social.statusConnected',
  EXPIRED: 'marketing.social.statusExpired',
  ERROR: 'marketing.social.statusError',
};

export const VERDICT_LABEL: Record<SocialAiStatus, string> = {
  PENDING: 'marketing.social.verdictPending',
  CLEAN: 'marketing.social.verdictClean',
  FLAGGED: 'marketing.social.verdictFlagged',
};

export const SENTIMENT_LABEL: Record<SocialSentiment, string> = {
  POSITIVE: 'marketing.social.sentimentPositive',
  NEUTRAL: 'marketing.social.sentimentNeutral',
  NEGATIVE: 'marketing.social.sentimentNegative',
};

export const SEVERITY_LABEL: Record<SocialSeverity, string> = {
  LOW: 'marketing.social.severityLow',
  MEDIUM: 'marketing.social.severityMedium',
  HIGH: 'marketing.social.severityHigh',
};

export const REVIEW_LABEL: Record<SocialReviewStatus, string> = {
  OPEN: 'marketing.social.reviewOpen',
  REVIEWED: 'marketing.social.reviewReviewed',
};

/** The AI's reason codes; a code the model invents beyond these shows as sent. */
export const CATEGORY_LABEL: Record<string, string> = {
  ABUSE: 'marketing.social.categoryAbuse',
  HATE: 'marketing.social.categoryHate',
  THREAT: 'marketing.social.categoryThreat',
  SEXUAL: 'marketing.social.categorySexual',
  SPAM: 'marketing.social.categorySpam',
  SCAM: 'marketing.social.categoryScam',
  PERSONAL_INFO: 'marketing.social.categoryPersonalInfo',
  MISINFORMATION: 'marketing.social.categoryMisinformation',
  COMPLAINT: 'marketing.social.categoryComplaint',
};

export const PUBLISH_STATUS_LABEL: Record<SocialPublishStatus, string> = {
  DRAFT: 'marketing.social.publishDraft',
  SCHEDULED: 'marketing.social.publishScheduled',
  PUBLISHING: 'marketing.social.publishPublishing',
  PUBLISHED: 'marketing.social.publishPublished',
  PARTIAL: 'marketing.social.publishPartial',
  FAILED: 'marketing.social.publishFailed',
};

export const PUBLISH_STATUS_COLORS = {
  DRAFT: 'default',
  SCHEDULED: 'info',
  PUBLISHING: 'warning',
  PUBLISHED: 'success',
  PARTIAL: 'warning',
  FAILED: 'error',
} as const;

export const TARGET_STATUS_LABEL: Record<SocialTargetStatus, string> = {
  PENDING: 'marketing.social.targetPending',
  PUBLISHED: 'marketing.social.targetPublished',
  FAILED: 'marketing.social.targetFailed',
};

export const TARGET_STATUS_COLORS = { PENDING: 'default', PUBLISHED: 'success', FAILED: 'error' } as const;

export const QUEUE_VIEW_LABEL: Record<SocialQueueView, string> = {
  QUEUE: 'marketing.social.viewQueue',
  DRAFTS: 'marketing.social.viewDrafts',
  SENT: 'marketing.social.viewSent',
};

export const IDEA_STATUS_LABEL: Record<SocialIdeaStatus, string> = {
  NEW: 'marketing.social.ideaNew',
  USED: 'marketing.social.ideaUsed',
  DISMISSED: 'marketing.social.ideaDismissed',
};

export const IDEA_FORMAT_LABEL: Record<SocialIdeaFormat, string> = {
  TEXT: 'marketing.social.formatText',
  IMAGE: 'marketing.social.formatImage',
  VIDEO: 'marketing.social.formatVideo',
};

/** The network a provider's connection brings in — one each, now that every network has its own app. */
export const PROVIDER_PLATFORMS: Record<SocialProvider, readonly SocialPlatform[]> = {
  INSTAGRAM: ['INSTAGRAM'],
  FACEBOOK: ['FACEBOOK'],
  THREADS: ['THREADS'],
  YOUTUBE: ['YOUTUBE'],
  LINKEDIN: ['LINKEDIN'],
  X: ['X'],
};

export const STATUS_COLORS = { CONNECTED: 'success', EXPIRED: 'warning', ERROR: 'error' } as const;
export const VERDICT_COLORS = { PENDING: 'default', CLEAN: 'success', FLAGGED: 'error' } as const;
export const SEVERITY_COLORS = { LOW: 'info', MEDIUM: 'warning', HIGH: 'error' } as const;
export const SENTIMENT_COLORS = { POSITIVE: 'success', NEUTRAL: 'default', NEGATIVE: 'warning' } as const;

type Translate = (key: string) => string;

/** A table filter's options for one of the maps above. */
export const enumOptions = <T extends string>(values: readonly T[], labels: Record<T, string>, t: Translate) =>
  values.map((value) => ({ value, label: t(labels[value]) }));
