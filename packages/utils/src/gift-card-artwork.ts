/**
 * A gift card's uploaded artwork — the two faces an admin sets on the category
 * in Admin > Categories. Both are plain URLs, and an empty one simply means
 * "this face was never uploaded".
 *
 * The whole feature is a fallback rule: a card with artwork renders the artwork
 * and can be flipped; a card without renders exactly the generated gradient
 * card it always did. mWeb and the native app share this decision (rule 40) so
 * a card can never flip on one surface and sit flat on the other.
 */
export interface GiftCardArtwork {
  front: string;
  back: string;
}

/** Normalise the two snapshot URLs into an artwork pair (trims, never null). */
export function giftCardArtwork(
  front?: string | null,
  back?: string | null
): GiftCardArtwork {
  return { front: (front ?? '').trim(), back: (back ?? '').trim() };
}

/**
 * May this card be flipped? Only once at least one face carries artwork —
 * flipping a gradient card onto the same gradient card shows the viewer
 * nothing, so the affordance stays hidden until there is a second side to see.
 */
export function canFlipGiftCard(artwork: GiftCardArtwork): boolean {
  return !!artwork.front || !!artwork.back;
}
