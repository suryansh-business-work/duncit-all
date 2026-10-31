import { gql } from '@apollo/client';

/**
 * Reel Studio's GraphQL surface.
 *
 * A reel is selected in full in exactly one document, `REEL_PROJECT`, written
 * out rather than interpolated from a shared constant — an interpolated
 * selection in a `gql` template is invisible to the document verifier.
 */

export const REEL_PROJECTS = gql`
  query ReelProjects {
    reelProjects {
      id
      name
      drive_url
      asset_count
      scene_count
      duration_ms
      cover_url
      last_check_pass
      posts_count
      views
      created_by
      created_at
      updated_at
    }
  }
`;

/**
 * The edit as the studio reads it. One selection, shared by the reel query and
 * the hand-edit save, so the timeline and the player can never read a
 * different shape of the same spec.
 */
export const REEL_SPEC_FIELDS = gql`
  fragment ReelSpecFields on ReelSpec {
    fps
    width
    height
    aspect
    background
    music {
      asset_id
      volume
      trim_start_ms
    }
    voiceover {
      asset_id
      volume
    }
    brand {
      watermark_asset_id
      watermark_corner
      watermark_width_pct
      primary_color
    }
    captions {
      style
    }
    scenes {
      id
      asset_id
      duration_ms
      trim_start_ms
      volume
      playback_rate
      fit
      motion
      transition
      transition_ms
      background
      texts {
        id
        text
        position
        style
        animation
        start_ms
        duration_ms
        color
        background
      }
      overlays {
        id
        asset_id
        corner
        width_pct
        opacity
        start_ms
        duration_ms
      }
    }
  }
`;

export const REEL_PROJECT = gql`
  query ReelProject($id: ID!) {
    reelProject(id: $id) {
      id
      name
      drive_url
      drive_folder_id
      duration_ms
      cover_at_ms
      created_by
      created_at
      updated_at
      assets {
        id
        kind
        source
        name
        mime_type
        drive_file_id
        url
        thumbnail_url
        duration_ms
        width
        height
        size_bytes
        licence
        attribution
        provider_id
      }
      spec {
        ...ReelSpecFields
      }
      messages {
        id
        role
        text
        asset_ids
        restorable
        failed
        at
      }
      variants {
        platform
        caption
        hashtags
        title
      }
      checks {
        name
        pass
        detail
      }
      posts {
        post_id
        platform
        permalink
        published_at
      }
    }
  }
  ${REEL_SPEC_FIELDS}
`;

/** Stock footage from the provider the server is configured with; one page at a time. */
export const REEL_MEDIA_SEARCH = gql`
  query ReelMediaSearch($query: String!, $kind: ReelAssetKind!, $orientation: ReelAspect!, $page: Int!) {
    reelMediaSearch(query: $query, kind: $kind, orientation: $orientation, page: $page) {
      items {
        id
        kind
        url
        preview_url
        width
        height
        duration_ms
        licence
        attribution
        provider_id
      }
      has_more
    }
  }
`;

/** The pre-export checks for the networks the reel is going to. */
export const VALIDATE_REEL = gql`
  query ValidateReel($project_id: ID!, $platforms: [SocialPlatform!]!) {
    validateReel(project_id: $project_id, platforms: $platforms) {
      name
      pass
      detail
    }
  }
`;

/** How the reel's posts have done, in total and one by one. */
export const REEL_ANALYTICS = gql`
  query ReelAnalytics($project_id: ID!) {
    reelAnalytics(project_id: $project_id) {
      posts {
        platform
        permalink
        published_at
        views
        likes
        comments
        shares
        engagement
      }
      views
      likes
      comments
      shares
      engagement
    }
  }
`;

export const REEL_DRIVE_STATUS = gql`
  query ReelDriveStatus {
    reelDriveStatus {
      configured
      service_account_email
    }
  }
`;

export const REEL_DRIVE_FOLDER = gql`
  query ReelDriveFolder($folder: String!) {
    reelDriveFolder(folder: $folder) {
      id
      name
      truncated
      entries {
        id
        name
        mime_type
        kind
        size_bytes
        duration_ms
        width
        height
        thumbnail_url
      }
    }
  }
`;

export const CREATE_REEL_PROJECT = gql`
  mutation CreateReelProject($input: ReelProjectInput!) {
    createReelProject(input: $input) {
      id
    }
  }
`;

export const UPDATE_REEL_PROJECT = gql`
  mutation UpdateReelProject($id: ID!, $input: ReelProjectInput!) {
    updateReelProject(id: $id, input: $input) {
      id
      name
      drive_url
      drive_folder_id
      updated_at
    }
  }
`;

export const DELETE_REEL_PROJECT = gql`
  mutation DeleteReelProject($id: ID!) {
    deleteReelProject(id: $id)
  }
`;

/**
 * The four mutations that change a reel answer with only its id. Each caller
 * refetches `REEL_PROJECT` afterwards, so the studio has ONE selection of a
 * reel and a field added to it cannot be forgotten in four other documents.
 */
export const ADD_REEL_DRIVE_ASSETS = gql`
  mutation AddReelDriveAssets($project_id: ID!, $file_ids: [ID!]!) {
    addReelDriveAssets(project_id: $project_id, file_ids: $file_ids) {
      id
    }
  }
`;

export const REMOVE_REEL_ASSET = gql`
  mutation RemoveReelAsset($project_id: ID!, $asset_id: ID!) {
    removeReelAsset(project_id: $project_id, asset_id: $asset_id) {
      id
    }
  }
`;

export const SEND_REEL_MESSAGE = gql`
  mutation SendReelMessage($input: ReelMessageInput!) {
    sendReelMessage(input: $input) {
      id
    }
  }
`;

export const RESTORE_REEL_VERSION = gql`
  mutation RestoreReelVersion($project_id: ID!, $message_id: ID!) {
    restoreReelVersion(project_id: $project_id, message_id: $message_id) {
      id
    }
  }
`;

/**
 * The studio's other ways of changing a reel. Like the four above, each
 * answers with the reel's id and the caller refetches `REEL_PROJECT`.
 */
export const ADD_REEL_STOCK_ASSETS = gql`
  mutation AddReelStockAssets($project_id: ID!, $items: [ReelStockAssetInput!]!) {
    addReelStockAssets(project_id: $project_id, items: $items) {
      id
    }
  }
`;

export const ADD_REEL_UPLOAD_ASSETS = gql`
  mutation AddReelUploadAssets($project_id: ID!, $uploads: [ReelUploadInput!]!) {
    addReelUploadAssets(project_id: $project_id, uploads: $uploads) {
      id
    }
  }
`;

export const APPLY_REEL_STORYBOARD = gql`
  mutation ApplyReelStoryboard($project_id: ID!, $script: ReelScriptInput!, $auto_media: Boolean!) {
    applyReelStoryboard(project_id: $project_id, script: $script, auto_media: $auto_media) {
      id
    }
  }
`;

export const GENERATE_REEL_VOICEOVER = gql`
  mutation GenerateReelVoiceover($project_id: ID!, $text: String!, $voice: String!, $language: String!) {
    generateReelVoiceover(project_id: $project_id, text: $text, voice: $voice, language: $language) {
      id
    }
  }
`;

export const GENERATE_REEL_SUBTITLES = gql`
  mutation GenerateReelSubtitles($project_id: ID!, $asset_id: ID!, $language: String!) {
    generateReelSubtitles(project_id: $project_id, asset_id: $asset_id, language: $language) {
      id
    }
  }
`;

export const GENERATE_REEL_VARIANTS = gql`
  mutation GenerateReelVariants($project_id: ID!, $platforms: [SocialPlatform!]!) {
    generateReelVariants(project_id: $project_id, platforms: $platforms) {
      id
    }
  }
`;

export const SET_REEL_COVER = gql`
  mutation SetReelCover($project_id: ID!, $at_ms: Int!) {
    setReelCover(project_id: $project_id, at_ms: $at_ms) {
      id
    }
  }
`;

/** The two creative steps answer with what they made, and the run that made it. */
export const GENERATE_REEL_IDEAS = gql`
  mutation GenerateReelIdeas($project_id: ID!, $brief: String!, $count: Int!) {
    generateReelIdeas(project_id: $project_id, brief: $brief, count: $count) {
      run_id
      concepts {
        id
        title
        hook
        angle
        why
      }
    }
  }
`;

export const GENERATE_REEL_SCRIPT = gql`
  mutation GenerateReelScript($project_id: ID!, $concept: ReelConceptInput!, $length_s: Int!, $tone: String!) {
    generateReelScript(project_id: $project_id, concept: $concept, length_s: $length_s, tone: $tone) {
      run_id
      hooks
      scenes {
        text
        shot
        duration_ms
        asset_query
      }
      cta
    }
  }
`;

export const RECOMMEND_NEXT_REEL = gql`
  mutation RecommendNextReel($project_id: ID!) {
    recommendNextReel(project_id: $project_id) {
      run_id
      recommendations {
        title
        why
        evidence
      }
    }
  }
`;

/**
 * A hand edit from the timeline. It answers with the sanitized spec, which the
 * cache writes onto the reel, so no refetch follows every keystroke.
 */
export const SAVE_REEL_SPEC = gql`
  mutation SaveReelSpec($project_id: ID!, $spec_json: String!) {
    saveReelSpec(project_id: $project_id, spec_json: $spec_json) {
      id
      duration_ms
      updated_at
      spec {
        ...ReelSpecFields
      }
    }
  }
  ${REEL_SPEC_FIELDS}
`;
