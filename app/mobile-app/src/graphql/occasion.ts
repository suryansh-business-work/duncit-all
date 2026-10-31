import { gql } from '@/generated/graphql';

/** One mode's colour tokens a look overrides; '' keeps the app's own. */
export const OccasionPaletteFieldsFragment = gql(`
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
`);

/**
 * The festive look Marketing → Occasions has live (public: the app reads it
 * before sign-in). Only what the native renderer draws is asked for — no
 * schedule, catalogue or admin fields. `theme` null is the house look;
 * `next_change_at` is when a scheduled look may open or close, so an open app
 * knows when to ask again.
 */
export const OccasionLiveDocument = gql(`
  query MobileOccasionLive {
    occasionLive {
      next_change_at
      theme {
        key
        color_mode
        greeting
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
      }
    }
  }
`);
