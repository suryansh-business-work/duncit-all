import { describe, expect, it } from 'vitest';
import { venueImages } from '../src/venue-images';

describe('venueImages', () => {
  it('puts the cover first, then the gallery, with blanks dropped and repeats collapsed', () => {
    expect(
      venueImages({
        cover_image_url: 'https://ik.imagekit.io/duncit/venues/cafe-cover.jpg',
        gallery: [
          '  ',
          'https://ik.imagekit.io/duncit/venues/cafe-cover.jpg',
          null,
          'https://ik.imagekit.io/duncit/venues/cafe-terrace.jpg',
        ],
      }),
    ).toEqual([
      'https://ik.imagekit.io/duncit/venues/cafe-cover.jpg',
      'https://ik.imagekit.io/duncit/venues/cafe-terrace.jpg',
    ]);
  });

  it('is empty for a venue with no photos, no gallery, or no venue at all', () => {
    expect(venueImages({ cover_image_url: null, gallery: null })).toEqual([]);
    expect(venueImages({})).toEqual([]);
    expect(venueImages(null)).toEqual([]);
    expect(venueImages(undefined)).toEqual([]);
  });
});
