import gql from 'graphql-tag';

export const reelTypeDefs = gql`
  enum ReelAssetKind {
    VIDEO
    IMAGE
    AUDIO
  }

  enum ReelAssetSource {
    "Footage read from the project's Google Drive folder."
    DRIVE
    "A picture attached in the chat."
    UPLOAD
  }

  enum ReelDriveEntryKind {
    FOLDER
    VIDEO
    IMAGE
    AUDIO
  }

  enum ReelMessageRole {
    USER
    ASSISTANT
  }

  enum ReelFit {
    "Fill the frame, cropping the edges."
    COVER
    "Show everything, letterboxed on the scene's background."
    CONTAIN
  }

  enum ReelMotion {
    NONE
    ZOOM_IN
    ZOOM_OUT
    PAN_LEFT
    PAN_RIGHT
  }

  enum ReelTransition {
    NONE
    FADE
    SLIDE
    WIPE
  }

  enum ReelTextPosition {
    TOP
    CENTER
    BOTTOM
  }

  enum ReelTextStyle {
    TITLE
    SUBTITLE
    CAPTION
  }

  enum ReelTextAnimation {
    NONE
    FADE
    POP
    SLIDE_UP
    TYPEWRITER
  }

  enum ReelCorner {
    TOP_LEFT
    TOP_RIGHT
    BOTTOM_LEFT
    BOTTOM_RIGHT
    CENTER
  }

  "One clip, picture or sound file a reel can use."
  type ReelAsset {
    id: ID!
    kind: ReelAssetKind!
    source: ReelAssetSource!
    name: String!
    mime_type: String!
    "DRIVE: the Drive file this is, so the folder browser can tell what the reel already holds. Empty for an upload."
    drive_file_id: String!
    "Where the player reads it from. For Drive footage this is a signed link that expires — refetch the project rather than storing it."
    url: String!
    "A preview frame; empty for a sound file."
    thumbnail_url: String!
    "0 when Drive has not finished measuring the file."
    duration_ms: Int!
    width: Int!
    height: Int!
    size_bytes: Float!
  }

  "Words on top of a scene. Times are milliseconds from the start of that scene."
  type ReelText {
    id: ID!
    text: String!
    position: ReelTextPosition!
    style: ReelTextStyle!
    animation: ReelTextAnimation!
    start_ms: Int!
    "0 = stays until the scene ends."
    duration_ms: Int!
    color: String!
    "The colour of a pill behind the words; empty for none."
    background: String!
  }

  "A picture on top of a scene — a logo or a sticker."
  type ReelOverlay {
    id: ID!
    asset_id: ID!
    corner: ReelCorner!
    "Width as a share of the frame, 5-100."
    width_pct: Int!
    opacity: Float!
    start_ms: Int!
    "0 = stays until the scene ends."
    duration_ms: Int!
  }

  type ReelScene {
    id: ID!
    "Empty for a colour card — a scene that is only its background and text."
    asset_id: String!
    duration_ms: Int!
    "VIDEO: where in the clip the scene starts."
    trim_start_ms: Int!
    volume: Float!
    playback_rate: Float!
    fit: ReelFit!
    motion: ReelMotion!
    "How this scene arrives from the one before it."
    transition: ReelTransition!
    "How long the two scenes overlap; 0 for a cut."
    transition_ms: Int!
    background: String!
    texts: [ReelText!]!
    overlays: [ReelOverlay!]!
  }

  "A sound file played under the whole reel."
  type ReelMusic {
    asset_id: ID!
    volume: Float!
    trim_start_ms: Int!
  }

  """
  The reel's edit, as data. The portal draws exactly this with Remotion; the
  server sanitizes it on every write and every read, so each field is always
  present and always in range.
  """
  type ReelSpec {
    fps: Int!
    width: Int!
    height: Int!
    background: String!
    scenes: [ReelScene!]!
    music: ReelMusic
  }

  type ReelMessage {
    id: ID!
    role: ReelMessageRole!
    text: String!
    "USER: the pictures attached to this message."
    asset_ids: [ID!]!
    "ASSISTANT: true when this reply produced an edit that can be put back."
    restorable: Boolean!
    "ASSISTANT: true when the editor could not be reached or read."
    failed: Boolean!
    at: String!
  }

  "A reel: its Drive folder, its footage, the conversation and the edit."
  type ReelProject {
    id: ID!
    name: String!
    drive_url: String!
    drive_folder_id: String!
    assets: [ReelAsset!]!
    spec: ReelSpec!
    "How long the reel plays."
    duration_ms: Int!
    messages: [ReelMessage!]!
    created_by: String!
    created_at: String
    updated_at: String
  }

  "A reel as the list shows it — without its conversation."
  type ReelProjectSummary {
    id: ID!
    name: String!
    drive_url: String!
    asset_count: Int!
    scene_count: Int!
    duration_ms: Int!
    created_by: String!
    created_at: String
    updated_at: String
  }

  "Whether the server can read Google Drive, and the address a folder must be shared with."
  type ReelDriveStatus {
    configured: Boolean!
    service_account_email: String!
  }

  type ReelDriveEntry {
    id: ID!
    name: String!
    mime_type: String!
    kind: ReelDriveEntryKind!
    size_bytes: Float!
    duration_ms: Int!
    width: Int!
    height: Int!
    "A signed preview link; empty for a folder or a sound file."
    thumbnail_url: String!
  }

  type ReelDriveFolder {
    id: ID!
    name: String!
    entries: [ReelDriveEntry!]!
    "True when the folder holds more than is listed."
    truncated: Boolean!
  }

  input ReelProjectInput {
    name: String!
    "A Google Drive folder link, or empty for a reel built only from uploads."
    drive_url: String
  }

  "A picture already uploaded to the media store, attached to a chat message."
  input ReelUploadInput {
    url: String!
    name: String!
    width: Int
    height: Int
    size_bytes: Float
  }

  input ReelMessageInput {
    project_id: ID!
    text: String!
    uploads: [ReelUploadInput!]
  }

  extend type Query {
    reelProjects: [ReelProjectSummary!]!
    reelProject(id: ID!): ReelProject
    reelDriveStatus: ReelDriveStatus!
    "The videos, pictures, sound files and sub-folders of a Drive folder. folder is a link or a folder id."
    reelDriveFolder(folder: String!): ReelDriveFolder!
  }

  extend type Mutation {
    createReelProject(input: ReelProjectInput!): ReelProject!
    updateReelProject(id: ID!, input: ReelProjectInput!): ReelProject!
    deleteReelProject(id: ID!): Boolean!
    "Add Drive files to a reel's footage. Files it already holds are skipped."
    addReelDriveAssets(project_id: ID!, file_ids: [ID!]!): ReelProject!
    "Remove footage from a reel. Scenes that used it are dropped from the edit."
    removeReelAsset(project_id: ID!, asset_id: ID!): ReelProject!
    "One chat turn: the request (and any attached pictures) goes to the editor, and the reel comes back as it now stands."
    sendReelMessage(input: ReelMessageInput!): ReelProject!
    "Put back the edit an earlier reply produced."
    restoreReelVersion(project_id: ID!, message_id: ID!): ReelProject!
    """
    Save an edit made by hand on the timeline. spec_json is the whole ReelSpec as
    JSON; it is sanitized against the project's footage exactly as the editor's
    answers are, and the reel comes back as it now stands.
    """
    saveReelSpec(project_id: ID!, spec_json: String!): ReelProject!
  }
`;
