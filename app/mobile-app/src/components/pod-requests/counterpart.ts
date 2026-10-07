import type { PodRequestRow } from '@/hooks/usePodRequests';

/** The other party of a request, as one row or card draws it. */
export interface Counterpart {
  kind: 'HOST' | 'VENUE';
  name: string;
  imageUrl: string;
  /** Category and place for a venue; the categories for a host. */
  subtitle: string;
}

const joinParts = (parts: readonly (string | undefined)[]): string =>
  parts.filter(Boolean).join(' · ');

/** A host looks at the venue; a venue owner looks at the host (mWeb twin). */
export function counterpartOf(
  request: Pick<PodRequestRow, 'viewer_side' | 'venue' | 'host'>,
): Counterpart {
  if (request.viewer_side === 'HOST') {
    const venue = request.venue;
    return {
      kind: 'VENUE',
      name: venue?.venue_name ?? '',
      imageUrl: venue?.cover_image_url ?? '',
      subtitle: joinParts([venue?.category, venue?.locality, venue?.city]),
    };
  }
  const host = request.host;
  return {
    kind: 'HOST',
    name: host?.name ?? '',
    imageUrl: host?.photo_url ?? '',
    subtitle: joinParts(host?.categories ?? []),
  };
}

/** A distance to one decimal, as the "{{km}} km away" line shows it. */
export const formatKm = (km: number): string => String(Math.round(km * 10) / 10);
