import { describe, expect, it } from 'vitest';
import { venueImages } from '../src/venue-images';

const HALL = 'https://ik.imagekit.io/duncit/venues/sunset-hall-cover.jpg';
const STAGE = 'https://ik.imagekit.io/duncit/venues/sunset-hall-stage.jpg';
const TERRACE = 'https://ik.imagekit.io/duncit/venues/sunset-hall-terrace.jpg';

/**
 * The one list every surface indexes into.
 *
 * A card's slider and the detail page's lightbox read the SAME array, so the
 * order and the deduping are not cosmetic: a venue whose cover also sits in its
 * gallery has to collapse identically in both, or tapping the third photo opens
 * the fourth.
 */
describe('venueImages', () => {
  it('puts the cover first, then the gallery in order', () => {
    expect(
      venueImages({ cover_image_url: HALL, gallery: [STAGE, TERRACE] })
    ).toEqual([HALL, STAGE, TERRACE]);
  });

  it('collapses a cover that also appears in the gallery, keeping it first', () => {
    expect(
      venueImages({ cover_image_url: HALL, gallery: [STAGE, HALL, TERRACE] })
    ).toEqual([HALL, STAGE, TERRACE]);
  });

  it('drops blanks, whitespace and nulls from either field', () => {
    expect(
      venueImages({ cover_image_url: '   ', gallery: [STAGE, null, '', '  ', TERRACE] })
    ).toEqual([STAGE, TERRACE]);
  });

  it('trims the padding off a stored url rather than treating it as a different photo', () => {
    expect(venueImages({ cover_image_url: ` ${HALL} `, gallery: [HALL] })).toEqual([HALL]);
  });

  it('reads a venue with only a cover, and one with only a gallery', () => {
    expect(venueImages({ cover_image_url: HALL })).toEqual([HALL]);
    expect(venueImages({ gallery: [STAGE] })).toEqual([STAGE]);
  });

  /*
    An empty list is the signal a card reads to render its placeholder instead
    of an empty slider — so "no photos" and "not loaded yet" have to answer the
    same way.
  */
  it('answers with an empty list for a venue with no photos, and for no venue', () => {
    expect(venueImages({ cover_image_url: null, gallery: [] })).toEqual([]);
    expect(venueImages({})).toEqual([]);
    expect(venueImages(null)).toEqual([]);
    expect(venueImages(undefined)).toEqual([]);
  });
});
