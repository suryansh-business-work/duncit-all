import { gql } from '@apollo/client';
import type { SocialPlatform } from './queries';

export type SocialPublishStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'SCHEDULED' | 'PUBLISHING' | 'PUBLISHED' | 'PARTIAL' | 'FAILED';
export type SocialTargetStatus = 'PENDING' | 'PUBLISHED' | 'FAILED';
export type SocialMediaType = 'IMAGE' | 'VIDEO';
export type SocialPublishMode = 'DRAFT' | 'SCHEDULE' | 'NOW';
export type SocialQueueView = 'QUEUE' | 'APPROVALS' | 'DRAFTS' | 'SENT';
export type SocialIdeaStatus = 'NEW' | 'USED' | 'DISMISSED';
export type SocialIdeaFormat = 'TEXT' | 'IMAGE' | 'VIDEO';

/** One item of a post's media, in the order it is shown — a carousel is several. */
export interface SocialPostMedia {
  url: string;
  type: SocialMediaType;
}

export interface SocialPublishTarget {
  account_id: string;
  account_name: string;
  platform: SocialPlatform;
  status: SocialTargetStatus;
  permalink: string | null;
  error: string | null;
  published_at: string | null;
}

export interface SocialScheduledPost {
  id: string;
  text: string;
  /** The first media item, kept for posts written before carousels. */
  media_url: string | null;
  media_type: SocialMediaType | null;
  media: SocialPostMedia[];
  status: SocialPublishStatus;
  scheduled_at: string | null;
  published_at: string | null;
  idea_id: string | null;
  needs_approval: boolean;
  /** Why a reviewer sent it back — shown to the author on the draft. */
  review_note: string | null;
  approval_run_id: string | null;
  /** Instagram usernames invited as collaborators. */
  collaborators: string[];
  targets: SocialPublishTarget[];
}

export interface SocialCalendarItem {
  id: string;
  kind: 'PLANNED' | 'PUBLISHED';
  at: string;
  status: SocialPublishStatus;
  text: string;
  media_url: string | null;
  media_count: number;
  permalink: string | null;
  platforms: SocialPlatform[];
  account_names: string[];
  engagement: number | null;
}

export interface SocialIdea {
  id: string;
  title: string;
  caption: string;
  hashtags: string[];
  platforms: SocialPlatform[];
  format: SocialIdeaFormat;
  why: string | null;
  brief: string | null;
  status: SocialIdeaStatus;
  created_at: string | null;
}

export interface SocialScheduledPostInput {
  text: string;
  /** Replaces media_url / media_type on the server; the first item fills them. */
  media: SocialPostMedia[];
  account_ids: string[];
  mode: SocialPublishMode;
  scheduled_at: string | null;
  idea_id: string | null;
  /** With SCHEDULE or NOW the server parks the post as PENDING_APPROVAL for a manager. */
  needs_approval: boolean;
  /** The Reel Studio project the post was made from, when it was. */
  reel_project_id?: string | null;
  /** Instagram usernames to invite as collaborators (Instagram takes at most 3). */
  collaborators: string[];
}

const SCHEDULED_POST_FIELDS = gql`
  fragment SocialScheduledPostFields on SocialScheduledPost {
    id
    text
    media_url
    media_type
    media {
      url
      type
    }
    status
    scheduled_at
    published_at
    idea_id
    needs_approval
    review_note
    approval_run_id
    collaborators
    targets {
      account_id
      account_name
      platform
      status
      permalink
      error
      published_at
    }
  }
`;

const IDEA_FIELDS = gql`
  fragment SocialIdeaFields on SocialIdea {
    id
    title
    caption
    hashtags
    platforms
    format
    why
    brief
    status
    created_at
  }
`;

export const SOCIAL_SCHEDULED_POSTS = gql`
  query SocialScheduledPosts($view: SocialQueueView!) {
    socialScheduledPosts(view: $view) {
      ...SocialScheduledPostFields
    }
  }
  ${SCHEDULED_POST_FIELDS}
`;

export const SOCIAL_SCHEDULED_POST = gql`
  query SocialScheduledPost($id: ID!) {
    socialScheduledPost(id: $id) {
      ...SocialScheduledPostFields
    }
  }
  ${SCHEDULED_POST_FIELDS}
`;

export const SOCIAL_CALENDAR = gql`
  query SocialCalendar($from: String!, $to: String!) {
    socialCalendar(from: $from, to: $to) {
      id
      kind
      at
      status
      text
      media_url
      media_count
      permalink
      platforms
      account_names
      engagement
    }
  }
`;

export const CREATE_SCHEDULED_SOCIAL_POST = gql`
  mutation CreateScheduledSocialPost($input: SocialScheduledPostInput!) {
    createScheduledSocialPost(input: $input) {
      ...SocialScheduledPostFields
    }
  }
  ${SCHEDULED_POST_FIELDS}
`;

export const UPDATE_SCHEDULED_SOCIAL_POST = gql`
  mutation UpdateScheduledSocialPost($id: ID!, $input: SocialScheduledPostInput!) {
    updateScheduledSocialPost(id: $id, input: $input) {
      ...SocialScheduledPostFields
    }
  }
  ${SCHEDULED_POST_FIELDS}
`;

export const DELETE_SCHEDULED_SOCIAL_POST = gql`
  mutation DeleteScheduledSocialPost($id: ID!) {
    deleteScheduledSocialPost(id: $id)
  }
`;

export const SHARE_SCHEDULED_SOCIAL_POST_NOW = gql`
  mutation ShareScheduledSocialPostNow($id: ID!) {
    shareScheduledSocialPostNow(id: $id) {
      ...SocialScheduledPostFields
    }
  }
  ${SCHEDULED_POST_FIELDS}
`;

export const RETRY_SCHEDULED_SOCIAL_POST = gql`
  mutation RetryScheduledSocialPost($id: ID!) {
    retryScheduledSocialPost(id: $id) {
      ...SocialScheduledPostFields
    }
  }
  ${SCHEDULED_POST_FIELDS}
`;

export const SOCIAL_IDEAS = gql`
  query SocialIdeas($status: SocialIdeaStatus) {
    socialIdeas(status: $status) {
      ...SocialIdeaFields
    }
  }
  ${IDEA_FIELDS}
`;

export const GENERATE_SOCIAL_IDEAS = gql`
  mutation GenerateSocialIdeas($input: SocialIdeasInput!) {
    generateSocialIdeas(input: $input) {
      ...SocialIdeaFields
    }
  }
  ${IDEA_FIELDS}
`;

export const SET_SOCIAL_IDEA_STATUS = gql`
  mutation SetSocialIdeaStatus($id: ID!, $status: SocialIdeaStatus!) {
    setSocialIdeaStatus(id: $id, status: $status) {
      ...SocialIdeaFields
    }
  }
  ${IDEA_FIELDS}
`;

export const DELETE_SOCIAL_IDEA = gql`
  mutation DeleteSocialIdea($id: ID!) {
    deleteSocialIdea(id: $id)
  }
`;

/** Every list a publish action can change — refetched by name, so only the ones on screen run. */
export const PUBLISH_LISTS = ['SocialScheduledPosts', 'SocialCalendar', 'SocialIdeas'];
