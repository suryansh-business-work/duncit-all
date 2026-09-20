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

export const PROVIDERS: readonly SocialProvider[] = ['LINKEDIN', 'META', 'X', 'YOUTUBE'];

export const PROVIDER_LABEL: Record<SocialProvider, string> = {
  LINKEDIN: 'marketing.social.providerLinkedin',
  META: 'marketing.social.providerMeta',
  X: 'marketing.social.providerX',
  YOUTUBE: 'marketing.social.providerYoutube',
};

/** What connecting the provider adds — Meta brings two kinds of account. */
export const PROVIDER_ADDS: Record<SocialProvider, string> = {
  LINKEDIN: 'marketing.social.addsLinkedin',
  META: 'marketing.social.addsMeta',
  X: 'marketing.social.addsX',
  YOUTUBE: 'marketing.social.addsYoutube',
};

export const PLATFORMS: readonly SocialPlatform[] = ['LINKEDIN', 'FACEBOOK', 'INSTAGRAM', 'X', 'YOUTUBE'];

export const PLATFORM_LABEL: Record<SocialPlatform, string> = {
  LINKEDIN: 'marketing.social.platformLinkedin',
  FACEBOOK: 'marketing.social.platformFacebook',
  INSTAGRAM: 'marketing.social.platformInstagram',
  X: 'marketing.social.platformX',
  YOUTUBE: 'marketing.social.platformYoutube',
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

/** The networks a provider's connection brings in. */
export const PROVIDER_PLATFORMS: Record<SocialProvider, readonly SocialPlatform[]> = {
  LINKEDIN: ['LINKEDIN'],
  META: ['FACEBOOK', 'INSTAGRAM'],
  X: ['X'],
  YOUTUBE: ['YOUTUBE'],
};

export const STATUS_COLORS = { CONNECTED: 'success', EXPIRED: 'warning', ERROR: 'error' } as const;
export const VERDICT_COLORS = { PENDING: 'default', CLEAN: 'success', FLAGGED: 'error' } as const;
export const SEVERITY_COLORS = { LOW: 'info', MEDIUM: 'warning', HIGH: 'error' } as const;
export const SENTIMENT_COLORS = { POSITIVE: 'success', NEUTRAL: 'default', NEGATIVE: 'warning' } as const;

type Translate = (key: string) => string;

/** A table filter's options for one of the maps above. */
export const enumOptions = <T extends string>(values: readonly T[], labels: Record<T, string>, t: Translate) =>
  values.map((value) => ({ value, label: t(labels[value]) }));
