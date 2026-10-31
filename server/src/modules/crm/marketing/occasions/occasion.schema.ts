import gql from 'graphql-tag';

export const occasionTypeDefs = gql`
  """
  A built-in mark a particle layer draws (each is a small vector picture in a
  24x24 box). DIYA is a lit oil lamp, MODAK the sweet, CHAKRA the Ashoka
  Chakra, MARIGOLD a marigold bloom; the rest are what they say. For anything
  else, give the layer custom_paths.
  """
  enum OccasionShape {
    CIRCLE
    SPARK
    STAR
    HEART
    PETAL
    LEAF
    CONFETTI
    SNOWFLAKE
    DIYA
    FLAME
    KITE
    MOON
    LANTERN
    BALLOON
    BAT
    FEATHER
    DROP
    RING
    MODAK
    EGG
    CHAKRA
    SUN
    PUMPKIN
    GHOST
    GIFT
    BELL
    CANDY_CANE
    TREE
    ORNAMENT
    MARIGOLD
  }

  "How a particle layer moves: FALL from the top (snow, petals), RISE from the bottom (diyas, hearts), DRIFT across from the left (bats, kites), TWINKLE in place with a pulsing glow (stars, sparks)."
  enum OccasionMotion {
    FALL
    RISE
    DRIFT
    TWINKLE
  }

  "What a flyer draws: a built-in picture, CUSTOM (its own custom_layers) or IMAGE (an uploaded transparent PNG/GIF at image_url). Built-ins face right."
  enum OccasionArtwork {
    "Santa in his sleigh behind two reindeer, the lead one red-nosed."
    SANTA_SLEIGH
    "A witch on a broomstick with her cat."
    WITCH_BROOM
    "A four-colour patang with a bow-tied tail."
    KITE
    "A striped hot-air balloon."
    HOT_AIR_BALLOON
    "A bright star; give it a trail_color and it streaks across."
    SHOOTING_STAR
    CUSTOM
    IMAGE
  }

  enum OccasionDirection {
    LTR
    RTL
  }

  "A wash over the whole screen: VIGNETTE darkens the edges (spooky, night), GLOW_TOP fades a colour down from the top (warm festive glow), FOG drifts soft banks along the bottom."
  enum OccasionOverlayStyle {
    NONE
    VIGNETTE
    GLOW_TOP
    FOG
  }

  "Decoration hung along the top edge: STRING_LIGHTS (twinkling bulbs), BUNTING (triangle flags), MARIGOLD (a toran with mango leaves), SPIDER_WEB (webs in both corners and a spider), ICICLES (a snow cap with icicles)."
  enum OccasionGarlandStyle {
    NONE
    STRING_LIGHTS
    BUNTING
    MARIGOLD
    SPIDER_WEB
    ICICLES
  }

  "AUTO wears the look in whichever mode the viewer chose; LIGHT or DARK pins one (Halloween pins DARK)."
  enum OccasionColorMode {
    AUTO
    LIGHT
    DARK
  }

  "Where a look sits in the Marketing catalogue."
  enum OccasionRegion {
    INDIAN
    NATIONAL
    WESTERN
    GLOBAL
    CUSTOM
  }

  "NORMAL = the apps' own house look; MANUAL = one look pinned (manual_key); SCHEDULE = whichever look's date window is open, else the house look."
  enum OccasionLiveMode {
    NORMAL
    MANUAL
    SCHEDULE
  }

  "Why the live look is on: pinned, opened by its schedule, a preview link, or NONE (the house look)."
  enum OccasionLiveSource {
    MANUAL
    SCHEDULE
    PREVIEW
    NONE
  }

  "A swarm of small marks — snow, petals, sparks, bats, confetti. Near marks are drawn bigger, faster and brighter than far ones, and falling ones tumble in 3D."
  type OccasionParticleLayer {
    shapes: [OccasionShape!]!
    "Extra marks as SVG path data in a 24x24 box centred on (12, 12)."
    custom_paths: [String!]!
    "Hex fills, one picked per mark."
    colors: [String!]!
    motion: OccasionMotion!
    "Marks on a 1440px-wide desktop (0-160); a phone gets fewer, never under 45%."
    count: Int!
    "Mark size range in px (2-120)."
    size_min: Float!
    size_max: Float!
    "Pixels per second (1-600). For TWINKLE, how quick the pulse is."
    speed: Float!
    "0.05-1."
    opacity: Float!
  }

  "One piece of a vector artwork: SVG path data painted with a fill and/or an outline, offset by (x, y) inside the artwork's box."
  type OccasionVectorLayer {
    path: String!
    "Hex, or '' for no fill."
    fill: String!
    "Hex, or '' for no outline."
    stroke: String!
    stroke_width: Float!
    x: Float!
    y: Float!
  }

  "Artwork that crosses the screen every so often — Santa's sleigh, a witch, a kite — with a soft shadow and an optional sparkle trail."
  type OccasionFlyer {
    artwork: OccasionArtwork!
    "For CUSTOM: layers drawn facing right in a 240x120 box."
    custom_layers: [OccasionVectorLayer!]!
    "For IMAGE: an https link to a transparent PNG or GIF."
    image_url: String!
    direction: OccasionDirection!
    "The band it crosses in, as % of the screen height from the top (0-90). Each pass picks its own height inside it."
    altitude_min: Float!
    altitude_max: Float!
    "Drawn width in px (24-480)."
    size: Float!
    "Seconds to cross the screen (2-60)."
    duration: Float!
    "Seconds from one pass's start to the next (never shorter than duration, at most 600)."
    interval: Float!
    "Pixels of gentle up-and-down while it flies (0-60)."
    bob: Float!
    "Hex colour of the sparkle dust behind it; '' for none."
    trail_color: String!
  }

  "Bursts of glowing, streaking sparks in the upper half of the screen."
  type OccasionFireworks {
    enabled: Boolean!
    colors: [String!]!
    "1-60."
    bursts_per_minute: Float!
    "Sparks per burst (6-60)."
    sparks: Int!
    "Burst radius in px (20-300)."
    radius: Float!
  }

  type OccasionOverlay {
    style: OccasionOverlayStyle!
    color: String!
    "0-1 at its strongest point."
    opacity: Float!
  }

  type OccasionGarland {
    style: OccasionGarlandStyle!
    "Bulb / flag / flower colours cycled along the string; empty uses the style's own."
    colors: [String!]!
  }

  """
  A festive look for the Duncit apps (mWeb and the native app), managed in
  Marketing → Occasions. Its colour tokens repaint every screen; its
  decoration plays over them (with a pause control, and still under reduced
  motion). Built-in festivals ship ready; anything else is designed here.
  """
  type OccasionTheme {
    "Stable, URL-safe id, e.g. christmas, diwali."
    key: String!
    name: String!
    description: String!
    region: OccasionRegion!
    color_mode: OccasionColorMode!
    """
    The app's colour tokens this look overrides in light mode; '' keeps the
    app's own. Keep it readable: onPrimary on primary, onAccent on accent,
    ink and muted on bg/surface/soft all need 4.5:1 contrast.
    """
    palette_light: ThemeModeTokens!
    palette_dark: ThemeModeTokens!
    particles: [OccasionParticleLayer!]!
    flyers: [OccasionFlyer!]!
    fireworks: OccasionFireworks!
    overlays: [OccasionOverlay!]!
    garland: OccasionGarland!
    "A short festive line the apps show once a session (max 80 characters); '' shows none."
    greeting: String!
    "The window this look goes live in by itself while the live mode is SCHEDULE (ISO dates)."
    starts_at: String
    ends_at: String
    schedule_enabled: Boolean!
    "Higher wins when two windows overlap."
    sort_order: Int!
    "Shipped with Duncit: can be edited, archived or reset, not deleted."
    is_builtin: Boolean!
    is_archived: Boolean!
    updated_at: String
  }

  "What the apps wear right now."
  type OccasionLive {
    mode: OccasionLiveMode!
    source: OccasionLiveSource!
    "Null = the house look."
    theme: OccasionTheme
    "When the scheduled look may next change (a window opens or closes), so an open app knows when to look again."
    next_change_at: String
  }

  type OccasionSettings {
    mode: OccasionLiveMode!
    "The pinned look's key while mode is MANUAL."
    manual_key: String!
    updated_at: String
  }

  input OccasionParticleLayerInput {
    shapes: [OccasionShape!]
    custom_paths: [String!]
    colors: [String!]!
    motion: OccasionMotion!
    count: Int
    size_min: Float
    size_max: Float
    speed: Float
    opacity: Float
  }

  input OccasionVectorLayerInput {
    path: String!
    fill: String
    stroke: String
    stroke_width: Float
    x: Float
    y: Float
  }

  input OccasionFlyerInput {
    artwork: OccasionArtwork!
    custom_layers: [OccasionVectorLayerInput!]
    image_url: String
    direction: OccasionDirection
    altitude_min: Float
    altitude_max: Float
    size: Float
    duration: Float
    interval: Float
    bob: Float
    trail_color: String
  }

  input OccasionFireworksInput {
    enabled: Boolean!
    colors: [String!]
    bursts_per_minute: Float
    sparks: Int
    radius: Float
  }

  input OccasionOverlayInput {
    style: OccasionOverlayStyle!
    color: String
    opacity: Float
  }

  input OccasionGarlandInput {
    style: OccasionGarlandStyle!
    colors: [String!]
  }

  """
  A look's design. On a new look, name is required and the rest default to
  the house look with no decoration. On an existing look only the fields sent
  change — send just particles to change just the particles.
  """
  input OccasionThemeInput {
    "For a new look only: its id. Blank makes one from the name."
    key: String
    name: String
    description: String
    region: OccasionRegion
    color_mode: OccasionColorMode
    palette_light: ThemeModeTokensInput
    palette_dark: ThemeModeTokensInput
    "Up to 4 layers."
    particles: [OccasionParticleLayerInput!]
    "Up to 3."
    flyers: [OccasionFlyerInput!]
    fireworks: OccasionFireworksInput
    "Up to 3, painted in order."
    overlays: [OccasionOverlayInput!]
    garland: OccasionGarlandInput
    greeting: String
  }

  input OccasionScheduleInput {
    starts_at: String
    ends_at: String
    "On only with both dates set and the end after the start."
    schedule_enabled: Boolean!
    sort_order: Int
  }

  input OccasionLiveInput {
    mode: OccasionLiveMode!
    "Required for MANUAL: the key of a look that is not archived."
    manual_key: String
  }

  extend type Query {
    "The look the Duncit apps wear right now (public — the apps read it before sign-in). preview = a look's key shows that look instead, for Marketing's preview link."
    occasionLive(preview: String): OccasionLive!
    "Marketing → Occasions: every look, built-in festivals first."
    occasionThemes(include_archived: Boolean): [OccasionTheme!]!
    occasionTheme(key: String!): OccasionTheme
    occasionSettings: OccasionSettings!
  }

  extend type Mutation {
    "Design a look: no key creates one, a key changes that one (only the fields sent). An agent asked to design a festival sends a full OccasionThemeInput here."
    saveOccasionTheme(key: String, input: OccasionThemeInput!): OccasionTheme!
    "Copy a look under a new name, to adapt it without touching the original."
    duplicateOccasionTheme(key: String!, name: String!): OccasionTheme!
    "Put a built-in look back the way Duncit shipped it (its schedule is kept)."
    resetOccasionTheme(key: String!): OccasionTheme!
    "Hide a look from the catalogue (or bring it back). The pinned live look cannot be archived."
    archiveOccasionTheme(key: String!, archived: Boolean!): OccasionTheme!
    "Delete a look someone made. Built-in looks are archived instead."
    deleteOccasionTheme(key: String!): Boolean!
    "Set the dates a look goes live by itself (used while the live mode is SCHEDULE)."
    setOccasionSchedule(key: String!, input: OccasionScheduleInput!): OccasionTheme!
    "Switch what every Duncit app wears: the house look, one pinned look, or the schedule. Takes effect on the next app load."
    setOccasionLive(input: OccasionLiveInput!): OccasionSettings!
  }
`;
