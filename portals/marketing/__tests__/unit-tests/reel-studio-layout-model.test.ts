import { describe, expect, it } from 'vitest';
import {
  PANE_LIMITS,
  clampSize,
  defaultLayout,
  dockedRow,
  fromSaved,
  sameLayout,
  toPanes,
  withMode,
  withRect,
  withSize,
  type PaneState,
} from '../../src/pages/reels/studio/layout/layoutModel';

const saved = (over: Partial<PaneState>): PaneState => ({ id: 'SOURCES', mode: 'DOCKED', size: 400, x: 5, y: 6, width: 500, height: 600, ...over });

describe('the studio layout', () => {
  it('starts with every pane docked at its starting size, the player taking the rest', () => {
    const layout = defaultLayout();
    expect(dockedRow(layout)).toEqual(['SOURCES', 'PREVIEW', 'SIDE']);
    expect(layout.SOURCES.size).toBe(320);
    expect(layout.PREVIEW.size).toBe(0);
    expect(layout.TIMELINE).toMatchObject({ mode: 'DOCKED', size: 300 });
    // Each pane's first window opens offset from the last.
    expect(layout.PREVIEW.x).toBeGreaterThan(layout.SOURCES.x);
  });

  it('keeps every size within limits a person can still work in', () => {
    expect(clampSize('SOURCES', 10)).toBe(PANE_LIMITS.SOURCES.min);
    expect(clampSize('SIDE', 99_999)).toBe(PANE_LIMITS.SIDE.max);
    expect(clampSize('TIMELINE', 250.6)).toBe(251);
    expect(withSize(defaultLayout(), 'SOURCES', 2000).SOURCES.size).toBe(PANE_LIMITS.SOURCES.max);
  });

  it('never keeps a size for the player, which is whatever the others leave', () => {
    const layout = defaultLayout();
    expect(withSize(layout, 'PREVIEW', 900)).toBe(layout);
  });

  it('lays a saved arrangement over the defaults, clamped, unknown panes ignored and missing ones defaulted', () => {
    const layout = fromSaved([
      saved({ size: 5 }),
      saved({ id: 'SIDE', mode: 'POPPED', size: 0, x: -3, width: 0, height: Number.NaN }),
      saved({ id: 'PREVIEW', size: 700 }),
      saved({ id: 'NOPE' as PaneState['id'] }),
    ]);
    expect(layout.SOURCES).toMatchObject({ mode: 'DOCKED', size: PANE_LIMITS.SOURCES.min, x: 5, y: 6, width: 500, height: 600 });
    // A zero size falls back to the start; a broken window falls back to the starting window.
    expect(layout.SIDE).toMatchObject({ mode: 'POPPED', size: 380, x: 0, width: 480, height: 560 });
    expect(layout.PREVIEW.size).toBe(0);
    expect(layout.TIMELINE).toEqual(defaultLayout().TIMELINE);
    expect(fromSaved(null)).toEqual(defaultLayout());
  });

  it('changes one pane at a time and leaves the others alone', () => {
    const start = defaultLayout();
    const popped = withRect(withMode(start, 'SIDE', 'POPPED'), 'SIDE', { x: 10.4, y: 20.6, width: 640, height: 480 });
    expect(popped.SIDE).toMatchObject({ mode: 'POPPED', x: 10, y: 21, width: 640, height: 480 });
    expect(popped.SOURCES).toBe(start.SOURCES);
    expect(dockedRow(popped)).toEqual(['SOURCES', 'PREVIEW']);
  });

  it('tells a changed arrangement from the saved one, and hands the server every pane in order', () => {
    const start = defaultLayout();
    expect(sameLayout(start, defaultLayout())).toBe(true);
    expect(sameLayout(start, withMode(start, 'TIMELINE', 'CLOSED'))).toBe(false);
    expect(sameLayout(start, withSize(start, 'SIDE', 500))).toBe(false);
    expect(toPanes(start).map((pane) => pane.id)).toEqual(['SOURCES', 'PREVIEW', 'SIDE', 'TIMELINE']);
  });
});
