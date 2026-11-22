import { gql } from '@apollo/client';

/**
 * The AI Library detail view's GraphQL surface (server: prompt.library.schema.ts).
 *
 * Selections are written out, never interpolated from a shared constant — an
 * interpolated fragment in a `gql` template can take a portal down at module
 * load (see queries.ts). The prompt itself is selected exactly as the list
 * selects it, so a row and its detail never disagree.
 */

export const AI_PROMPT_DETAIL = gql`
  query AiPromptDetail($id: ID!) {
    aiPromptDetail(id: $id) {
      prompt {
        id
        key
        kind
        role
        name
        description
        content
        category
        target_model
        variables {
          name
          label
          description
          required
          example
        }
        tasks
        usage {
          file
          surface
          trigger
        }
        token_count
        is_active
        created_at
        updated_at
      }
      archived_at
      archived_by_name
      quality {
        score
        summary
        strengths
        improvements
        model
        scored_at
        stale
      }
      share {
        enabled
        token
        shared_at
        shared_by_name
      }
      total_hits
      last_hit_at
      versions {
        version
        change
        changed_fields
        name
        description
        content
        category
        target_model
        is_active
        token_count
        edited_by_name
        created_at
      }
    }
  }
`;

export const AI_PROMPT_ANALYTICS = gql`
  query AiPromptAnalytics($id: ID!, $range_days: Int) {
    aiPromptAnalytics(id: $id, range_days: $range_days) {
      range_days
      total_hits
      unique_visitors
      by_type {
        key
        count
      }
      by_platform {
        key
        count
      }
      by_source {
        key
        count
      }
      by_device {
        key
        count
      }
      by_day {
        day
        count
      }
    }
  }
`;

export const SCORE_AI_PROMPT = gql`
  mutation ScoreAiPrompt($id: ID!, $force: Boolean) {
    scoreAiPrompt(id: $id, force: $force) {
      score
      summary
      strengths
      improvements
      model
      scored_at
      stale
    }
  }
`;

export const ARCHIVE_AI_PROMPT = gql`
  mutation ArchiveAiPrompt($id: ID!) {
    archiveAiPrompt(id: $id) {
      archived_at
    }
  }
`;

export const UNARCHIVE_AI_PROMPT = gql`
  mutation UnarchiveAiPrompt($id: ID!) {
    unarchiveAiPrompt(id: $id) {
      archived_at
    }
  }
`;

export const ENABLE_AI_PROMPT_SHARE = gql`
  mutation EnableAiPromptPublicShare($id: ID!, $regenerate: Boolean) {
    enableAiPromptPublicShare(id: $id, regenerate: $regenerate) {
      enabled
      token
      shared_at
      shared_by_name
    }
  }
`;

export const DISABLE_AI_PROMPT_SHARE = gql`
  mutation DisableAiPromptPublicShare($id: ID!) {
    disableAiPromptPublicShare(id: $id) {
      enabled
      token
      shared_at
      shared_by_name
    }
  }
`;

export const RESTORE_AI_PROMPT_VERSION = gql`
  mutation RestoreAiPromptVersion($id: ID!, $version: Int!) {
    restoreAiPromptVersion(id: $id, version: $version) {
      id
      content
    }
  }
`;

export const RECORD_AI_PROMPT_EVENT = gql`
  mutation RecordAiPromptEvent($id: ID!, $type: AiPromptEventType!, $platform: AiPromptPlatform) {
    recordAiPromptEvent(id: $id, type: $type, platform: $platform)
  }
`;
