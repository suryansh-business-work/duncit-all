/**
 * The "Earn with Duncit" photo wall (EarnShowcase.astro).
 *
 * Portraits from Pexels (free to use, hotlinking allowed), served from the
 * Pexels CDN: the copies meant for Duncit's ImageKit were never uploaded, and
 * every one of those URLs answered 404. A deliberately mixed audience — India,
 * the US, Africa, East Asia, Latin America, Europe — of the people who earn on
 * Duncit: hosts, café and venue owners, shopkeepers and sellers.
 *
 * Nine columns, the outer two on each side two photos deep, so the headline
 * sits in the gap the short middle columns leave. `offset` drops a column by
 * that many tile heights; narrower screens show only the middle columns.
 */
export interface EarnShowcaseColumn {
  /** Tile heights this column starts below the top of the wall. */
  offset: number;
  photos: string[];
}

const pexels = (id: number) => `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg`;

export const EARN_SHOWCASE_COLUMNS: EarnShowcaseColumn[] = [
  { offset: 0.55, photos: [pexels(8178754), pexels(7289739)] },
  { offset: 0.15, photos: [pexels(16537980), pexels(28386407)] },
  { offset: 0.6, photos: [pexels(18766134)] },
  { offset: 0.2, photos: [pexels(5409662)] },
  { offset: 0.45, photos: [pexels(6102858)] },
  { offset: 0.15, photos: [pexels(6205471)] },
  { offset: 0.6, photos: [pexels(7821525)] },
  { offset: 0.15, photos: [pexels(36330752), pexels(29086752)] },
  { offset: 0.55, photos: [pexels(7580822), pexels(8124422)] },
];

/** Tiles are 4:5. The Pexels CDN crops to the size and compresses for the browser. */
export function earnShowcaseImage(url: string, width: number): string {
  return `${url}?auto=compress&cs=tinysrgb&fit=crop&w=${width}&h=${Math.round(width * 1.25)}`;
}
