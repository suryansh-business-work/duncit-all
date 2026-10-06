/**
 * The "Earn with Duncit" photo wall (EarnShowcase.astro).
 *
 * Portraits from Pexels, imported onto Duncit's ImageKit so the sites never
 * hotlink a stock host. A deliberately mixed audience — India, the US, Africa,
 * East Asia, Latin America, Europe — of the people who earn on Duncit: hosts,
 * café and venue owners, shopkeepers and sellers.
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

const IK = 'https://ik.imagekit.io/esdata1/website/earn-showcase';

export const EARN_SHOWCASE_COLUMNS: EarnShowcaseColumn[] = [
  { offset: 0.55, photos: [`${IK}/earn-8178754.jpg`, `${IK}/earn-7289739.jpg`] },
  { offset: 0.15, photos: [`${IK}/earn-16537980.jpg`, `${IK}/earn-28386407.jpg`] },
  { offset: 0.6, photos: [`${IK}/earn-18766134.jpg`] },
  { offset: 0.2, photos: [`${IK}/earn-5409662.jpg`] },
  { offset: 0.45, photos: [`${IK}/earn-6102858.jpg`] },
  { offset: 0.15, photos: [`${IK}/earn-6205471.jpg`] },
  { offset: 0.6, photos: [`${IK}/earn-7821525.jpg`] },
  { offset: 0.15, photos: [`${IK}/earn-36330752.jpg`, `${IK}/earn-29086752.jpg`] },
  { offset: 0.55, photos: [`${IK}/earn-7580822.jpg`, `${IK}/earn-8124422.jpg`] },
];

/** Tiles are 4:5. ImageKit crops to the face and picks the format per browser. */
export function earnShowcaseImage(url: string, width: number): string {
  return `${url}?tr=w-${width},h-${Math.round(width * 1.25)},fo-face,q-70`;
}
