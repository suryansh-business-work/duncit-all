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
    "A picture or clip from the media store — attached in the chat or picked from the library."
    UPLOAD
    "A Pexels photo or video, kept by its CDN address with its licence line."
    STOCK
    "Sound made here — a voiceover."
    GENERATED
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

  "The frame: 1080x1920, 1080x1080 or 1920x1080."
  enum ReelAspect {
    PORTRAIT
    SQUARE
    LANDSCAPE
  }

  "How CAPTION texts are drawn: words alone, on a pill, or lit word by word."
  enum ReelCaptionStyle {
    PLAIN
    BOX
    HIGHLIGHT
  }

  "One clip, picture or sound file a reel can use."
  type ReelAsset {
    id: ID!
    kind: ReelAssetKind!
    source: ReelAssetSource!
    name: String!
    mime_type: String!
    "DRIVE: the Drive file this is, so the folder browser can tell what the reel already holds. Empty for the rest."
    drive_file_id: String!
    "Where the player reads it from. For Drive footage this is a signed link that expires — refetch the project rather than storing it."
    url: String!
    "A preview frame; empty for a sound file."
    thumbnail_url: String!
    "0 when Drive has not finished measuring the file, or nobody has."
    duration_ms: Int!
    width: Int!
    height: Int!
    size_bytes: Float!
    "STOCK: the library's licence line; empty for Drive, an upload or generated sound."
    licence: String!
    "STOCK: the credit the library asks for, e.g. \\"Photo by X on Pexels\\"."
    attribution: String!
    "STOCK: the library's own id for it."
    provider_id: String!
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

  "A spoken track played under the whole reel, from its start."
  type ReelVoiceover {
    asset_id: ID!
    volume: Float!
  }

  "The brand mark on every scene."
  type ReelBrand {
    "An IMAGE asset of the project; empty for no watermark."
    watermark_asset_id: String!
    watermark_corner: ReelCorner!
    "Width as a share of the frame, 5-50."
    watermark_width_pct: Float!
    "#RRGGBB for pills and highlights; empty for none."
    primary_color: String!
  }

  type ReelCaptions {
    style: ReelCaptionStyle!
  }

  """
  The reel's edit, as data. The portal draws exactly this with Remotion; the
  server sanitizes it on every write and every read, so each field is always
  present and always in range.
  """
  type ReelSpec {
    fps: Int!
    "Always the frame of aspect."
    width: Int!
    height: Int!
    aspect: ReelAspect!
    background: String!
    scenes: [ReelScene!]!
    music: ReelMusic
    voiceover: ReelVoiceover
    brand: ReelBrand!
    captions: ReelCaptions!
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

  "The words that go with the reel on one network, written within that network's ceiling."
  type ReelVariant {
    platform: SocialPlatform!
    caption: String!
    hashtags: [String!]!
    title: String!
  }

  "One line of the last validation."
  type ReelCheck {
    name: String!
    pass: Boolean!
    detail: String!
  }

  "A network the reel was posted to from the composer."
  type ReelPostLink {
    post_id: ID!
    platform: SocialPlatform!
    permalink: String!
    published_at: String
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
    "The caption, hashtags and title written per network; empty until generated."
    variants: [ReelVariant!]!
    "Where in the reel the cover frame is taken; null for the first frame."
    cover_at_ms: Int
    "The last validation, check by check; empty until validated."
    checks: [ReelCheck!]!
    "Every network a post carrying this reel reached."
    posts: [ReelPostLink!]!
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

  "One stock photo or video as the library lists it."
  type ReelMediaItem {
    id: ID!
    kind: ReelAssetKind!
    "The file the reel would use, on the library's CDN."
    url: String!
    "A small picture for the picker."
    preview_url: String!
    width: Int!
    height: Int!
    "0 for a photo."
    duration_ms: Int!
    licence: String!
    attribution: String!
    provider_id: String!
  }

  type ReelMediaPage {
    items: [ReelMediaItem!]!
    has_more: Boolean!
  }

  "A concept for a reel, as Create with AI suggests it."
  type ReelConcept {
    id: ID!
    title: String!
    "The first line on screen or spoken."
    hook: String!
    "The one idea the reel carries and the shots it needs."
    angle: String!
    "Who it is for and why they would share it."
    why: String!
  }

  type ReelIdeas {
    "The marketing run that recorded the call and its cost."
    run_id: ID!
    concepts: [ReelConcept!]!
  }

  "One scene of a script: the line on screen, the shot, how long, and the words a stock search would use for it."
  type ReelScriptScene {
    text: String!
    shot: String!
    duration_ms: Int!
    asset_query: String!
  }

  type ReelScript {
    run_id: ID!
    "Alternative opening lines; the first is the writer's pick."
    hooks: [String!]!
    scenes: [ReelScriptScene!]!
    "The closing line."
    cta: String!
  }

  type ReelRecommendation {
    title: String!
    why: String!
    "The figures it rests on."
    evidence: String!
  }

  type ReelRecommendations {
    run_id: ID!
    recommendations: [ReelRecommendation!]!
  }

  "How the reel did on one network — the synced post's numbers, or zeros until the next sync reads them."
  type ReelAnalyticsPost {
    platform: SocialPlatform!
    permalink: String!
    published_at: String
    views: Int!
    likes: Int!
    comments: Int!
    shares: Int!
    engagement: Int!
  }

  type ReelAnalytics {
    posts: [ReelAnalyticsPost!]!
    views: Int!
    likes: Int!
    comments: Int!
    shares: Int!
    engagement: Int!
  }

  input ReelProjectInput {
    name: String!
    "A Google Drive folder link, or empty for a reel built only from uploads."
    drive_url: String
  }

  "A picture or clip already uploaded to the media store."
  input ReelUploadInput {
    url: String!
    name: String!
    width: Int
    height: Int
    size_bytes: Float
  }

  "A stock photo or video as reelMediaSearch listed it, with its licence."
  input ReelStockAssetInput {
    provider_id: String!
    kind: ReelAssetKind!
    "On the library's CDN."
    url: String!
    preview_url: String
    name: String!
    width: Int
    height: Int
    duration_ms: Int
    licence: String!
    attribution: String!
  }

  input ReelMessageInput {
    project_id: ID!
    text: String!
    uploads: [ReelUploadInput!]
  }

  input ReelConceptInput {
    title: String!
    hook: String!
    angle: String!
  }

  input ReelScriptSceneInput {
    text: String!
    shot: String!
    duration_ms: Int!
    asset_query: String!
  }

  input ReelScriptInput {
    hooks: [String!]!
    scenes: [ReelScriptSceneInput!]!
    cta: String!
  }

  extend type Query {
    reelProjects: [ReelProjectSummary!]!
    reelProject(id: ID!): ReelProject
    reelDriveStatus: ReelDriveStatus!
    "The videos, pictures, sound files and sub-folders of a Drive folder. folder is a link or a folder id."
    reelDriveFolder(folder: String!): ReelDriveFolder!
    "Stock photos or videos from Pexels for a reel; portrait unless another orientation is asked for. Pages start at 1."
    reelMediaSearch(query: String!, kind: ReelAssetKind!, orientation: ReelAspect, page: Int): ReelMediaPage!
    """
    Check a reel against the networks it is going to: length within each
    network's reel limit, a portrait frame where the network wants one, sound,
    on-screen text within the limits, a hook in the first scene, and the brand
    watermark. The result is also kept on the project as its checks.
    """
    validateReel(project_id: ID!, platforms: [SocialPlatform!]!): [ReelCheck!]!
    "How the reel did everywhere it was posted from the composer, summed."
    reelAnalytics(project_id: ID!): ReelAnalytics!
  }

  extend type Mutation {
    createReelProject(input: ReelProjectInput!): ReelProject!
    updateReelProject(id: ID!, input: ReelProjectInput!): ReelProject!
    deleteReelProject(id: ID!): Boolean!
    "Add Drive files to a reel's footage. Files it already holds are skipped."
    addReelDriveAssets(project_id: ID!, file_ids: [ID!]!): ReelProject!
    "Add stock photos or videos as the library listed them. Items the reel already holds are skipped."
    addReelStockAssets(project_id: ID!, items: [ReelStockAssetInput!]!): ReelProject!
    "Add pictures, clips or sound files from the media store; the kind is read off the address."
    addReelUploadAssets(project_id: ID!, uploads: [ReelUploadInput!]!): ReelProject!
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
    "Concepts for a reel from a brief (1-10, five when not given). One marketing run, its cost on it."
    generateReelIdeas(project_id: ID!, brief: String!, count: Int): ReelIdeas!
    "A scene-by-scene script for a chosen concept, for a reel of length_s seconds."
    generateReelScript(project_id: ID!, concept: ReelConceptInput!, length_s: Int!, tone: String): ReelScript!
    """
    Lay a script on the timeline, one scene per script scene: footage whose name
    matches the scene's asset_query, else — with auto_media — the first portrait
    stock result for it (added as a STOCK asset), else a colour card with the
    line as its title. Saved like a chat edit, so it can be put back.
    """
    applyReelStoryboard(project_id: ID!, script: ReelScriptInput!, auto_media: Boolean): ReelProject!
    "Speak text with Sarvam, keep it as a GENERATED sound asset, and play it under the reel."
    generateReelVoiceover(project_id: ID!, text: String!, voice: String, language: String): ReelProject!
    "Transcribe a sound or video asset with timing and lay the lines as CAPTION texts on the scenes that play it."
    generateReelSubtitles(project_id: ID!, asset_id: ID!, language: String): ReelProject!
    "Write the caption, hashtags and title for each network, within its ceiling; kept on the project."
    generateReelVariants(project_id: ID!, platforms: [SocialPlatform!]!): ReelProject!
    "Pick the frame the cover is taken from, in milliseconds from the start."
    setReelCover(project_id: ID!, at_ms: Int!): ReelProject!
    "What to make next, from this reel's numbers and the account's recent posts."
    recommendNextReel(project_id: ID!): ReelRecommendations!
  }
`;
