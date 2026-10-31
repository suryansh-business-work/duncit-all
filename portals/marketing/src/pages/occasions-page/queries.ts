import { gql } from '@apollo/client';
import type { OccasionLive, OccasionSettings, OccasionTheme } from '@duncit/gql-types';

/**
 * Marketing → Occasions. Operation names carry the `Marketing` prefix so they
 * never share a cache entry or a name with mWeb's own `occasionLive` read.
 */

const PALETTE_FIELDS = gql`
  fragment OccasionPaletteFields on ThemeModeTokens {
    bg
    surface
    soft
    ink
    muted
    border
    inputBorder
    primary
    primaryHover
    primaryActive
    onPrimary
    accent
    onAccent
    brand
    success
    warning
    error
    info
    onSemantic
  }
`;

/** Everything a look is: the gallery previews it, the editor edits it. */
const THEME_FIELDS = gql`
  ${PALETTE_FIELDS}
  fragment OccasionThemeFields on OccasionTheme {
    key
    name
    description
    region
    color_mode
    palette_light {
      ...OccasionPaletteFields
    }
    palette_dark {
      ...OccasionPaletteFields
    }
    particles {
      shapes
      custom_paths
      colors
      motion
      count
      size_min
      size_max
      speed
      opacity
    }
    flyers {
      artwork
      custom_layers {
        path
        fill
        stroke
        stroke_width
        x
        y
      }
      image_url
      direction
      altitude_min
      altitude_max
      size
      duration
      interval
      bob
      trail_color
    }
    fireworks {
      enabled
      colors
      bursts_per_minute
      sparks
      radius
    }
    overlays {
      style
      color
      opacity
    }
    garland {
      style
      colors
    }
    greeting
    starts_at
    ends_at
    schedule_enabled
    sort_order
    is_builtin
    is_archived
    updated_at
  }
`;

const SETTINGS_FIELDS = gql`
  fragment OccasionSettingsFields on OccasionSettings {
    mode
    manual_key
    updated_at
  }
`;

/** Every look, archived ones too — the tabs filter on the client, so one cache entry serves all three. */
export const OCCASION_THEMES = gql`
  ${THEME_FIELDS}
  query MarketingOccasionThemes {
    occasionThemes(include_archived: true) {
      ...OccasionThemeFields
    }
  }
`;

export const OCCASION_THEME = gql`
  ${THEME_FIELDS}
  query MarketingOccasionTheme($key: String!) {
    occasionTheme(key: $key) {
      ...OccasionThemeFields
    }
  }
`;

/** What the apps wear now, and the live-mode setting behind it. */
export const OCCASION_LIVE = gql`
  ${THEME_FIELDS}
  ${SETTINGS_FIELDS}
  query MarketingOccasionLive {
    occasionLive {
      mode
      source
      next_change_at
      theme {
        ...OccasionThemeFields
      }
    }
    occasionSettings {
      ...OccasionSettingsFields
    }
  }
`;

export const SAVE_OCCASION_THEME = gql`
  ${THEME_FIELDS}
  mutation MarketingSaveOccasionTheme($key: String, $input: OccasionThemeInput!) {
    saveOccasionTheme(key: $key, input: $input) {
      ...OccasionThemeFields
    }
  }
`;

export const DUPLICATE_OCCASION_THEME = gql`
  mutation MarketingDuplicateOccasionTheme($key: String!, $name: String!) {
    duplicateOccasionTheme(key: $key, name: $name) {
      key
      name
    }
  }
`;

export const RESET_OCCASION_THEME = gql`
  mutation MarketingResetOccasionTheme($key: String!) {
    resetOccasionTheme(key: $key) {
      key
    }
  }
`;

export const ARCHIVE_OCCASION_THEME = gql`
  mutation MarketingArchiveOccasionTheme($key: String!, $archived: Boolean!) {
    archiveOccasionTheme(key: $key, archived: $archived) {
      key
      is_archived
    }
  }
`;

export const DELETE_OCCASION_THEME = gql`
  mutation MarketingDeleteOccasionTheme($key: String!) {
    deleteOccasionTheme(key: $key)
  }
`;

export const SET_OCCASION_SCHEDULE = gql`
  mutation MarketingSetOccasionSchedule($key: String!, $input: OccasionScheduleInput!) {
    setOccasionSchedule(key: $key, input: $input) {
      key
      starts_at
      ends_at
      schedule_enabled
      sort_order
    }
  }
`;

export const SET_OCCASION_LIVE = gql`
  ${SETTINGS_FIELDS}
  mutation MarketingSetOccasionLive($input: OccasionLiveInput!) {
    setOccasionLive(input: $input) {
      ...OccasionSettingsFields
    }
  }
`;

/** Every query a change to a look or the live mode can make stale. */
export const OCCASION_REFRESH = ['MarketingOccasionThemes', 'MarketingOccasionLive'];

export interface OccasionThemesData {
  occasionThemes: OccasionTheme[];
}

export interface OccasionThemeData {
  occasionTheme: OccasionTheme | null;
}

export interface OccasionLiveData {
  occasionLive: OccasionLive;
  occasionSettings: OccasionSettings;
}

export interface SaveOccasionThemeData {
  saveOccasionTheme: OccasionTheme;
}

export interface DuplicateOccasionThemeData {
  duplicateOccasionTheme: Pick<OccasionTheme, 'key' | 'name'>;
}
