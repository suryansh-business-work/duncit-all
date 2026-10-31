import { builtinLook, BUILTIN_LOOKS } from '../../occasion.catalogue';
import { OCCASION_PALETTES } from '../../occasion.palettes';
import { flyers, fireworks, garland, keyFrom, lookFrom, overlays, particleLayers, scheduleFrom } from '../../occasion.validate';

const SNOW = { shapes: ['SNOWFLAKE'], colors: ['#FFFFFF'], motion: 'FALL' };

describe('particleLayers', () => {
  it('keeps a well-formed layer, filling the ranges it leaves out', () => {
    expect(particleLayers([SNOW])).toEqual([
      { shapes: ['SNOWFLAKE'], custom_paths: [], colors: ['#FFFFFF'], motion: 'FALL', count: 30, size_min: 6, size_max: 14, speed: 40, opacity: 0.9 },
    ]);
  });

  it('keeps numbers inside the documented ranges instead of refusing them', () => {
    const [layer] = particleLayers([{ ...SNOW, count: 10_000, size_min: 50, size_max: 10, speed: -3, opacity: 7 }]);

    expect(layer).toMatchObject({ count: 160, size_min: 50, size_max: 50, speed: 1, opacity: 1 });
  });

  it('refuses a colour that is not hex, naming the layer', () => {
    expect(() => particleLayers([SNOW, { ...SNOW, colors: ['red'] }])).toThrow('Particle layer 2: "red" is not a hex colour like #FFD54F');
  });

  it('accepts custom SVG path data and refuses anything else in it', () => {
    expect(particleLayers([{ ...SNOW, shapes: [], custom_paths: ['M2 2h20v20H2z'] }])[0]?.custom_paths).toEqual(['M2 2h20v20H2z']);
    expect(() => particleLayers([{ ...SNOW, custom_paths: ['M0 0<script>'] }])).toThrow('may only hold SVG path commands');
    expect(() => particleLayers([{ ...SNOW, custom_paths: [`M0 0${' 1'.repeat(2500)}`] }])).toThrow('longer than 4000');
  });

  it('refuses a layer with nothing to draw or no colour', () => {
    expect(() => particleLayers([{ ...SNOW, shapes: [] }])).toThrow('pick at least one shape');
    expect(() => particleLayers([{ ...SNOW, colors: [] }])).toThrow('give it at least one colour');
  });

  it('keeps at most four layers', () => {
    expect(particleLayers(Array.from({ length: 6 }, () => SNOW))).toHaveLength(4);
  });
});

describe('flyers', () => {
  it('never lets the pause between passes be shorter than the crossing', () => {
    const [flyer] = flyers([{ artwork: 'SANTA_SLEIGH', duration: 20, interval: 5 }]);

    expect(flyer).toMatchObject({ artwork: 'SANTA_SLEIGH', duration: 20, interval: 20, direction: 'LTR' });
  });

  it('wants an https image for an IMAGE flyer', () => {
    expect(() => flyers([{ artwork: 'IMAGE' }])).toThrow('upload an image');
    expect(() => flyers([{ artwork: 'IMAGE', image_url: 'http://cdn.example/santa.png' }])).toThrow('must be an https:// link');
    expect(flyers([{ artwork: 'IMAGE', image_url: 'https://cdn.example/santa.png' }])[0]?.image_url).toBe('https://cdn.example/santa.png');
  });

  it('wants at least one paintable layer for a CUSTOM flyer and drops layers that paint nothing', () => {
    expect(() => flyers([{ artwork: 'CUSTOM', custom_layers: [{ path: 'M0 0h10v10z' }] }])).toThrow('needs at least one layer');
    const [flyer] = flyers([
      { artwork: 'CUSTOM', custom_layers: [{ path: 'M0 0h10v10z', fill: '#FF0000' }, { path: 'M0 0L5 5', stroke: '#000000', stroke_width: 2 }] },
    ]);
    expect(flyer?.custom_layers).toHaveLength(2);
  });
});

describe('fireworks, overlays and garland', () => {
  it('needs a colour only when the fireworks are on', () => {
    expect(fireworks({ enabled: false })).toMatchObject({ enabled: false, colors: [] });
    expect(() => fireworks({ enabled: true })).toThrow('at least one colour');
    expect(fireworks({ enabled: true, colors: ['#FFD54F'], sparks: 1000 }).sparks).toBe(60);
  });

  it('drops NONE overlays and defaults a blank overlay colour to black', () => {
    expect(overlays([{ style: 'NONE' }, { style: 'VIGNETTE', color: '' }])).toEqual([{ style: 'VIGNETTE', color: '#000000', opacity: 0.2 }]);
  });

  it('keeps a garland style with checked colours', () => {
    expect(garland({ style: 'MARIGOLD', colors: ['#FF8F00'] })).toEqual({ style: 'MARIGOLD', colors: ['#FF8F00'] });
    expect(garland(null)).toEqual({ style: 'NONE', colors: [] });
  });
});

describe('lookFrom', () => {
  const base = builtinLook('christmas');

  it('changes only the fields sent, so an agent can tweak one part of a look', () => {
    if (!base) throw new Error('christmas is a built-in look');
    const next = lookFrom({ greeting: 'Ho ho ho!' }, base);

    expect(next.greeting).toBe('Ho ho ho!');
    expect(next.particles).toBe(base.particles);
    expect(next.palette_light).toBe(base.palette_light);
  });

  it('refuses a look without a name and a palette colour that is not a colour', () => {
    if (!base) throw new Error('christmas is a built-in look');
    expect(() => lookFrom({ name: '   ' }, base)).toThrow('Give the look a name');
    expect(() => lookFrom({ palette_light: { primary: 'not-a-colour' } }, base)).toThrow('light.primary');
  });
});

describe('keyFrom', () => {
  it('makes a URL-safe key from the asked-for key or the name', () => {
    expect(keyFrom('', 'Ganesh Chaturthi 2026!')).toBe('ganesh-chaturthi-2026');
    expect(keyFrom('My Diwali', 'ignored')).toBe('my-diwali');
    expect(() => keyFrom('', '!!!')).toThrow('at least one letter or digit');
  });

  it("never mints a key the portal's routes use for themselves", () => {
    expect(keyFrom('', 'New')).toBe('new-look');
  });
});

describe('scheduleFrom', () => {
  it('keeps a window that ends after it starts', () => {
    expect(scheduleFrom({ starts_at: '2026-12-20T00:00:00.000Z', ends_at: '2026-12-27T00:00:00.000Z', schedule_enabled: true, sort_order: 5 })).toEqual({
      starts_at: new Date('2026-12-20T00:00:00.000Z'),
      ends_at: new Date('2026-12-27T00:00:00.000Z'),
      schedule_enabled: true,
      sort_order: 5,
    });
  });

  it('refuses a backwards window, an unreadable date, and switching on without dates', () => {
    expect(() => scheduleFrom({ starts_at: '2026-12-27', ends_at: '2026-12-20', schedule_enabled: false })).toThrow('must end after it starts');
    expect(() => scheduleFrom({ starts_at: 'soon', schedule_enabled: false })).toThrow('The start is not a date');
    expect(() => scheduleFrom({ schedule_enabled: true })).toThrow('before switching its schedule on');
  });
});

describe('the built-in catalogue', () => {
  it('ships every festival once, each with its own colour tokens for both modes', () => {
    const keys = BUILTIN_LOOKS.map((look) => look.key);

    expect(new Set(keys).size).toBe(keys.length);
    for (const look of BUILTIN_LOOKS) {
      expect(OCCASION_PALETTES[look.key]).toBeDefined();
      expect(look.palette_light.primary).toMatch(/^#[\dA-F]{6}$/i);
      expect(look.palette_dark.primary).toMatch(/^#[\dA-F]{6}$/i);
    }
  });

  it('passes its own validation, so a reset can never store a look the API would refuse', () => {
    for (const look of BUILTIN_LOOKS) {
      expect(() => lookFrom(look, look)).not.toThrow();
    }
  });

  it('wears Halloween in the dark and flies Santa over Christmas', () => {
    expect(builtinLook('halloween')?.color_mode).toBe('DARK');
    expect(builtinLook('christmas')?.flyers[0]?.artwork).toBe('SANTA_SLEIGH');
    expect(builtinLook('not-a-festival')).toBeNull();
  });
});
