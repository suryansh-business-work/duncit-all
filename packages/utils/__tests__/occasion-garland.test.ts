import { describe, expect, it } from 'vitest';
import type { OccasionGarlandStyle } from '../src/occasion-design';
import { GARLAND_DEFAULT_COLORS, GARLAND_DEPTH, garlandMarks, twinkleAlpha } from '../src/occasion-garland';

const WIDTH = 1000;
const STYLES: Exclude<OccasionGarlandStyle, 'NONE'>[] = ['STRING_LIGHTS', 'BUNTING', 'MARIGOLD', 'SPIDER_WEB', 'ICICLES'];

describe('garlandMarks', () => {
  it('hangs every style inside the top band of the screen and across its width', () => {
    for (const style of STYLES) {
      const marks = garlandMarks({ style, colors: [] }, WIDTH);
      expect(marks.length).toBeGreaterThan(2);
      for (const mark of marks) {
        expect(mark.x).toBeGreaterThanOrEqual(0);
        expect(mark.x).toBeLessThanOrEqual(WIDTH);
        expect(mark.y).toBeGreaterThanOrEqual(0);
        expect(mark.y).toBeLessThanOrEqual(GARLAND_DEPTH + 30);
      }
    }
  });

  it("strings the lights on a wire, cycling the look's colours, each bulb with its own twinkle", () => {
    const [wire, ...rest] = garlandMarks({ style: 'STRING_LIGHTS', colors: ['#FF0000', '#00FF00'] }, WIDTH);
    const bulbs = rest.filter((mark) => mark.twinkle !== null && mark.alpha === 1);

    expect(wire?.stroke).not.toBe('');
    expect(wire?.d.match(/Q/g)).toHaveLength(Math.round(WIDTH / 140));
    expect(bulbs.slice(0, 3).map((bulb) => bulb.fill)).toEqual(['#FF0000', '#00FF00', '#FF0000']);
    expect(new Set(bulbs.map((bulb) => bulb.twinkle)).size).toBeGreaterThan(bulbs.length / 2);
  });

  it('lights each bulb with a faint halo that pulses with it and a glint on the glass', () => {
    const rest = garlandMarks({ style: 'STRING_LIGHTS', colors: ['#FF0000'] }, WIDTH).slice(1);
    const bulbs = rest.filter((mark) => mark.twinkle !== null && mark.alpha === 1);
    const halos = rest.filter((mark) => mark.twinkle !== null && mark.alpha < 1);
    const glints = rest.filter((mark) => mark.fill === '#FFFFFF');

    expect(halos.map((halo) => halo.twinkle)).toEqual(bulbs.map((bulb) => bulb.twinkle));
    expect(halos.every((halo) => halo.fill === '#FF0000' && halo.alpha === 0.3)).toBe(true);
    expect(glints).toHaveLength(bulbs.length);
  });

  it("falls back to the style's own colours when the look gives none", () => {
    const flags = garlandMarks({ style: 'BUNTING', colors: [] }, WIDTH).slice(1);

    expect(flags.slice(0, 3).map((flag) => flag.fill)).toEqual(GARLAND_DEFAULT_COLORS.BUNTING);
    expect(flags.every((flag) => flag.twinkle === null)).toBe(true);
  });

  it('hangs a mango leaf under every other marigold', () => {
    const marks = garlandMarks({ style: 'MARIGOLD', colors: ['#FF8F00'] }, WIDTH).slice(1);
    const leaves = marks.filter((mark) => mark.fill === '#2E7D32');
    const flowers = marks.filter((mark) => mark.fill === '#FF8F00');

    expect(leaves.length).toBe(Math.ceil(flowers.length / 2));
    // Each flower is shaded at its heart, so the string reads as round blooms, not flat discs.
    expect(marks.filter((mark) => mark.fill === '#BF360C')).toHaveLength(flowers.length);
  });

  it('spins a web into both top corners and lets a spider down from one', () => {
    const marks = garlandMarks({ style: 'SPIDER_WEB', colors: ['#CCCCCC'] }, WIDTH);
    const webs = marks.filter((mark) => mark.stroke === '#CCCCCC');

    expect(webs).toHaveLength(3);
    expect(webs[0]?.d.startsWith('M 0 0 L')).toBe(true);
    expect(webs[1]?.d.startsWith(`M ${WIDTH} 0 L`)).toBe(true);
    expect(marks.some((mark) => mark.fill === '#1A0F24')).toBe(true);
  });

  it('lays a snow cap over icicles of uneven length', () => {
    const marks = garlandMarks({ style: 'ICICLES', colors: [] }, WIDTH);
    const cap = marks.at(-1);
    const lengths = new Set(marks.slice(0, -1).map((mark) => mark.d));

    expect(cap?.d.startsWith(`M 0 0 H ${WIDTH}`)).toBe(true);
    expect(lengths.size).toBeGreaterThan(5);
    // Every icicle catches the light down one side.
    const ice = marks.filter((mark) => mark.fill !== '' && mark !== cap);
    const shines = marks.filter((mark) => mark.stroke === '#FFFFFF');
    expect(shines).toHaveLength(ice.length);
  });

  it('draws nothing for NONE, a style this build does not know, or a screen with no width', () => {
    expect(garlandMarks({ style: 'NONE', colors: [] }, WIDTH)).toEqual([]);
    expect(garlandMarks({ style: 'LASERS' as OccasionGarlandStyle, colors: [] }, WIDTH)).toEqual([]);
    expect(garlandMarks({ style: 'BUNTING', colors: [] }, 0)).toEqual([]);
  });
});

describe('twinkleAlpha', () => {
  it('holds a steady mark at full strength', () => {
    expect(twinkleAlpha(null, 3)).toBe(1);
  });

  it('pulses a twinkling mark between 45% and full', () => {
    const samples = Array.from({ length: 40 }, (_, i) => twinkleAlpha(0.25, i * 0.1));

    expect(Math.min(...samples)).toBeGreaterThanOrEqual(0.45);
    expect(Math.max(...samples)).toBeLessThanOrEqual(1);
    expect(Math.max(...samples) - Math.min(...samples)).toBeGreaterThan(0.4);
  });
});
