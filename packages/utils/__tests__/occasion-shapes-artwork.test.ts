import { describe, expect, it } from 'vitest';
import { CUSTOM_ARTWORK_BOX, OCCASION_ARTWORKS, OCCASION_ARTWORK_NAMES, isOccasionArtwork, occasionArtwork } from '../src/occasion-artwork';
import { OCCASION_SHAPES, OCCASION_SHAPE_PATHS, isOccasionShape, occasionLayerPaths } from '../src/occasion-shapes';

/** Only path commands, numbers and separators — what Path2D and react-native-svg both parse. */
const PATH_DATA = /^[MmLlHhVvCcSsQqTtAaZz\d\s.,-]+$/;

describe('built-in shapes', () => {
  it('ships drawable path data for every listed shape and nothing unlisted', () => {
    expect(Object.keys(OCCASION_SHAPE_PATHS).sort()).toEqual([...OCCASION_SHAPES].sort());
    for (const shape of OCCASION_SHAPES) {
      expect(OCCASION_SHAPE_PATHS[shape]).toMatch(PATH_DATA);
    }
  });

  it('builds the marigold from eight petals round a centre', () => {
    expect(OCCASION_SHAPE_PATHS.MARIGOLD.match(/M/g)).toHaveLength(9);
  });

  it('recognises its own names only', () => {
    expect(isOccasionShape('SNOWFLAKE')).toBe(true);
    expect(isOccasionShape('snowflake')).toBe(false);
    expect(isOccasionShape('UNICORN')).toBe(false);
  });
});

describe('occasionLayerPaths', () => {
  it('lists built-in shapes, then trimmed custom paths, skipping unknown names and blank paths', () => {
    const paths = occasionLayerPaths({ shapes: ['STAR', 'UNICORN', 'BAT'], custom_paths: ['  M0 0h4v4z ', '   '] });

    expect(paths).toEqual([OCCASION_SHAPE_PATHS.STAR, OCCASION_SHAPE_PATHS.BAT, 'M0 0h4v4z']);
  });

  it('is empty when the layer has nothing drawable', () => {
    expect(occasionLayerPaths({ shapes: ['UNICORN'], custom_paths: [] })).toEqual([]);
  });
});

describe('built-in artwork', () => {
  it('gives every named artwork a box and well-formed layers', () => {
    for (const name of OCCASION_ARTWORK_NAMES) {
      const art = OCCASION_ARTWORKS[name];
      expect(art.width).toBeGreaterThan(0);
      expect(art.height).toBeGreaterThan(0);
      expect(art.layers.length).toBeGreaterThan(0);
      for (const piece of art.layers) {
        expect(piece.path).toMatch(PATH_DATA);
        // Every layer paints something: a fill, an outline with a width, or both.
        expect(piece.fill !== '' || (piece.stroke !== '' && piece.stroke_width > 0)).toBe(true);
      }
    }
  });

  it('pulls Santa through with two reindeer, the lead one red-nosed', () => {
    const noses = OCCASION_ARTWORKS.SANTA_SLEIGH.layers.filter((piece) => piece.fill === '#FF1744');

    expect(noses).toHaveLength(1);
    expect(noses[0]?.x).toBe(172);
    expect(OCCASION_ARTWORKS.SANTA_SLEIGH.layers.filter((piece) => piece.x === 110).length).toBeGreaterThan(5);
  });

  it('recognises its own names only', () => {
    expect(isOccasionArtwork('WITCH_BROOM')).toBe(true);
    expect(isOccasionArtwork('CUSTOM')).toBe(false);
  });
});

describe('occasionArtwork', () => {
  const custom = [{ path: 'M0 0h10v10z', fill: '#FF0000', stroke: '', stroke_width: 0, x: 0, y: 0 }];

  it('draws a built-in by name', () => {
    expect(occasionArtwork({ artwork: 'KITE', custom_layers: [] })).toBe(OCCASION_ARTWORKS.KITE);
  });

  it("draws a CUSTOM flyer's own layers in the custom box", () => {
    expect(occasionArtwork({ artwork: 'CUSTOM', custom_layers: custom })).toEqual({ ...CUSTOM_ARTWORK_BOX, layers: custom });
  });

  it('has no vector picture for an IMAGE flyer, an empty CUSTOM one or an unknown name', () => {
    expect(occasionArtwork({ artwork: 'IMAGE', custom_layers: custom })).toBeNull();
    expect(occasionArtwork({ artwork: 'CUSTOM', custom_layers: [] })).toBeNull();
    expect(occasionArtwork({ artwork: 'DRAGON', custom_layers: [] })).toBeNull();
  });
});
