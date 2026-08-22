import { describe, expect, it } from 'vitest';

import {
  BREAKPOINTS,
  CELL_HEIGHT,
  GRID_COLUMNS,
  defaultLayout,
  layoutsEqual,
  normalisePosition,
  resolveLayout,
  serialiseNodes,
} from '../src/layout';
import type { DashboardLayoutItem, DashboardWidget } from '../src/types';

const widget = (id: string, x: number, y: number, w: number, h: number): DashboardWidget =>
  ({ id, title: id, defaultLayout: { x, y, w, h }, render: () => null }) as unknown as DashboardWidget;

const item = (id: string, x: number, y: number, w: number, h: number): DashboardLayoutItem => ({ id, x, y, w, h });

describe('the grid constants', () => {
  it('is twelve columns wide, with the phone breakpoint collapsing to one', () => {
    expect(GRID_COLUMNS).toBe(12);
    expect(CELL_HEIGHT).toBeGreaterThan(0);
    expect(BREAKPOINTS.map((b) => b.c)).toEqual([1, 6]);
    expect(BREAKPOINTS[0]?.w).toBeLessThan(BREAKPOINTS[1]?.w ?? 0);
  });
});

describe('normalisePosition', () => {
  it('leaves a position that already fits', () => {
    expect(normalisePosition({ x: 3, y: 2, w: 4, h: 2 })).toEqual({ x: 3, y: 2, w: 4, h: 2 });
  });

  it('never lets a widget be narrower than a cell or wider than the grid', () => {
    expect(normalisePosition({ x: 0, y: 0, w: 0, h: 1 }).w).toBe(1);
    expect(normalisePosition({ x: 0, y: 0, w: 99, h: 1 }).w).toBe(GRID_COLUMNS);
  });

  it('pulls a widget back so its right edge lands on column twelve, not past it', () => {
    expect(normalisePosition({ x: 10, y: 0, w: 6, h: 2 })).toEqual({ x: 6, y: 0, w: 6, h: 2 });
  });

  it('clamps a negative origin to the top-left', () => {
    expect(normalisePosition({ x: -4, y: -9, w: 3, h: 2 })).toMatchObject({ x: 0, y: 0 });
  });

  it('rounds a fractional slot rather than storing a half cell', () => {
    expect(normalisePosition({ x: 2.4, y: 1.6, w: 3.5, h: 2.2 })).toEqual({ x: 2, y: 2, w: 4, h: 2 });
  });

  it('falls back to the minimum for a non-finite number', () => {
    expect(normalisePosition({ x: Number.NaN, y: Number.NaN, w: Number.NaN, h: Number.NaN })).toEqual({
      x: 0,
      y: 0,
      w: 1,
      h: 1,
    });
    expect(normalisePosition({ x: 0, y: 0, w: Number.POSITIVE_INFINITY, h: 1 }).w).toBe(1);
  });

  it('always leaves a widget at least one row tall', () => {
    expect(normalisePosition({ x: 0, y: 0, w: 2, h: 0 }).h).toBe(1);
    expect(normalisePosition({ x: 0, y: 0, w: 2, h: -3 }).h).toBe(1);
  });
});

describe('defaultLayout', () => {
  it('puts every widget in its declared slot — this is what Reset restores', () => {
    expect(defaultLayout([widget('a', 0, 0, 6, 2), widget('b', 6, 0, 6, 2)])).toEqual([
      item('a', 0, 0, 6, 2),
      item('b', 6, 0, 6, 2),
    ]);
  });

  it('normalises a declared slot that does not fit', () => {
    expect(defaultLayout([widget('a', 9, 0, 9, 2)])).toEqual([item('a', 3, 0, 9, 2)]);
  });

  it('is empty for no widgets', () => {
    expect(defaultLayout([])).toEqual([]);
  });
});

describe('resolveLayout', () => {
  const widgets = [widget('a', 0, 0, 6, 2), widget('b', 6, 0, 6, 2)];

  it('falls back to the defaults when nothing was ever saved', () => {
    expect(resolveLayout(widgets, null)).toEqual(defaultLayout(widgets));
    expect(resolveLayout(widgets, undefined)).toEqual(defaultLayout(widgets));
    expect(resolveLayout(widgets, [])).toEqual(defaultLayout(widgets));
  });

  it('honours the slots the user arranged', () => {
    const saved = [item('a', 6, 4, 3, 3), item('b', 0, 0, 12, 2)];

    expect(resolveLayout(widgets, saved)).toEqual([item('a', 6, 4, 3, 3), item('b', 0, 0, 12, 2)]);
  });

  it('drops a saved slot for a widget this build no longer defines', () => {
    const resolved = resolveLayout(widgets, [item('a', 0, 0, 6, 2), item('retired', 0, 4, 6, 2)]);

    expect(resolved.map((i) => i.id)).toEqual(['a', 'b']);
  });

  it('appends a widget shipped since the save BELOW the saved ones, keeping only its size', () => {
    // 'b' is new. Dropping it on its default slot (6,0) would land on top of
    // 'a', which the user deliberately moved there.
    const resolved = resolveLayout(widgets, [item('a', 6, 0, 6, 5)]);

    expect(resolved).toEqual([item('a', 6, 0, 6, 5), item('b', 6, 5, 6, 2)]);
  });

  it('stacks several new widgets under each other rather than on the same row', () => {
    const three = [...widgets, widget('c', 0, 0, 4, 3)];
    const resolved = resolveLayout(three, [item('a', 0, 0, 6, 2)]);

    expect(resolved.map((i) => [i.id, i.y])).toEqual([
      ['a', 0],
      ['b', 2],
      ['c', 4],
    ]);
  });

  it('normalises a stored slot that no longer fits the grid', () => {
    expect(resolveLayout([widget('a', 0, 0, 6, 2)], [item('a', 20, 0, 99, 2)])).toEqual([item('a', 0, 0, 12, 2)]);
  });
});

describe('serialiseNodes', () => {
  it('turns what the grid hands back into storable items', () => {
    expect(serialiseNodes([{ id: 'a', x: 0, y: 0, w: 6, h: 2 }])).toEqual([item('a', 0, 0, 6, 2)]);
  });

  it('drops a node with no id — nothing could match it back to a widget on read', () => {
    expect(serialiseNodes([{ x: 0, y: 0, w: 6, h: 2 }, { id: '', x: 0, y: 2, w: 6, h: 2 }, { id: null }])).toEqual([]);
  });

  it('reads a numeric id as a string', () => {
    expect(serialiseNodes([{ id: 7, x: 0, y: 0, w: 1, h: 1 }])[0]?.id).toBe('7');
  });

  it('fills in the origin and a one-cell size for a node the grid left blank', () => {
    expect(serialiseNodes([{ id: 'a' }])).toEqual([item('a', 0, 0, 1, 1)]);
  });
});

describe('layoutsEqual', () => {
  const base = [item('a', 0, 0, 6, 2), item('b', 6, 0, 6, 2)];

  it('is true for the same slots in any order', () => {
    expect(layoutsEqual(base, [base[1] as DashboardLayoutItem, base[0] as DashboardLayoutItem])).toBe(true);
  });

  it('is false when a widget moved, resized or was added', () => {
    expect(layoutsEqual(base, [item('a', 1, 0, 6, 2), base[1] as DashboardLayoutItem])).toBe(false);
    expect(layoutsEqual(base, [item('a', 0, 1, 6, 2), base[1] as DashboardLayoutItem])).toBe(false);
    expect(layoutsEqual(base, [item('a', 0, 0, 5, 2), base[1] as DashboardLayoutItem])).toBe(false);
    expect(layoutsEqual(base, base.slice(0, 1))).toBe(false);
  });

  it('is false when an id disappeared, even with the same count', () => {
    expect(layoutsEqual(base, [item('a', 0, 0, 6, 2), item('z', 6, 0, 6, 2)])).toBe(false);
  });

  it('ignores height for a fitContent widget, whose h is measured rather than stored', () => {
    const measured = [item('a', 0, 0, 6, 9), base[1] as DashboardLayoutItem];

    expect(layoutsEqual(base, measured)).toBe(false);
    expect(layoutsEqual(base, measured, new Set(['a']))).toBe(true);
  });

  it('still compares height for a widget not named as fitContent', () => {
    const measured = [item('a', 0, 0, 6, 9), base[1] as DashboardLayoutItem];

    expect(layoutsEqual(base, measured, new Set(['b']))).toBe(false);
  });
});
