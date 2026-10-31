import { gql } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import { useEffect, useState } from 'react';
import type { OccasionDesign } from '@duncit/utils';
import { logs } from '@duncit/logs';

export const OCCASION_LIVE = gql`
  fragment MwebOccasionPalette on ThemeModeTokens {
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

  query MwebOccasionLive($preview: String) {
    occasionLive(preview: $preview) {
      next_change_at
      theme {
        key
        name
        color_mode
        greeting
        palette_light {
          ...MwebOccasionPalette
        }
        palette_dark {
          ...MwebOccasionPalette
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
`;

interface OccasionLiveData {
  occasionLive: { next_change_at: string | null; theme: OccasionDesign | null };
}

/** `?occasion=<key>` previews a look for this browser session (Marketing's "Open on mWeb"); `?occasion=none` ends it. */
const PREVIEW_PARAM = 'occasion';
const PREVIEW_KEY = 'mweb_occasion_preview';
const END_PREVIEW = 'none';
/** setTimeout cannot wait longer; a change further out is picked up on the next visit. */
const MAX_WAIT_MS = 24 * 60 * 60 * 1000;

function readPreview(): string | null {
  const asked = new URLSearchParams(globalThis.location?.search ?? '').get(PREVIEW_PARAM)?.trim().toLowerCase() ?? '';
  try {
    if (asked === END_PREVIEW) sessionStorage.removeItem(PREVIEW_KEY);
    else if (asked) sessionStorage.setItem(PREVIEW_KEY, asked);
    return sessionStorage.getItem(PREVIEW_KEY);
  } catch (error) {
    // Storage blocked (private mode): the preview lasts while the parameter is in the URL.
    logs.mWeb.warn('occasion', 'previewStorage', { error });
    return asked && asked !== END_PREVIEW ? asked : null;
  }
}

/**
 * The festive look mWeb wears right now — null for the house look. Marketing
 * decides it (Marketing → Occasions): pinned, or opened by its schedule on the
 * server's application clock. When the schedule says the look changes while
 * the tab is open, it asks again at that moment.
 */
export function useOccasionLive(): OccasionDesign | null {
  const [preview] = useState(readPreview);
  const { data, refetch } = useQuery<OccasionLiveData>(OCCASION_LIVE, {
    variables: { preview },
    fetchPolicy: 'cache-and-network',
  });
  const nextChange = data?.occasionLive.next_change_at ?? null;

  useEffect(() => {
    if (!nextChange) return undefined;
    const wait = Date.parse(nextChange) - Date.now();
    if (!(wait > 0 && wait < MAX_WAIT_MS)) return undefined;
    const timer = globalThis.setTimeout(() => {
      refetch().catch((error: unknown) => logs.mWeb.warn('occasion', 'refetch', { error }));
    }, wait + 1000);
    return () => globalThis.clearTimeout(timer);
  }, [nextChange, refetch]);

  return data?.occasionLive.theme ?? null;
}
