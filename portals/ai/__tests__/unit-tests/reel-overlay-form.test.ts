import { describe, expect, it } from 'vitest';
import type { ReelOverlay } from '@duncit/gql-types';
import { formToOverlay, overlayToForm } from '../../src/forms/reel-overlay';

const overlay = {
  id: 'o1',
  asset_id: 'a2',
  corner: 'TOP_RIGHT',
  width_pct: 30,
  opacity: 0.5,
  start_ms: 1500,
  duration_ms: 2000,
} as unknown as ReelOverlay;

describe('reel overlay form mapping', () => {
  it('shows an overlay in the units the form edits (percent, seconds)', () => {
    expect(overlayToForm(overlay)).toEqual({ corner: 'TOP_RIGHT', width_pct: 30, opacity_pct: 50, start_s: 1.5, duration_s: 2 });
  });

  it('turns edited values back into the stored units and rounds the width', () => {
    expect(formToOverlay({ corner: 'BOTTOM_LEFT', width_pct: 33.4, opacity_pct: 80, start_s: 0.25, duration_s: 3 })).toEqual({
      corner: 'BOTTOM_LEFT',
      width_pct: 33,
      opacity: 0.8,
      start_ms: 250,
      duration_ms: 3000,
    });
  });

  it('round-trips an overlay without drift', () => {
    expect(formToOverlay(overlayToForm(overlay))).toMatchObject({
      corner: 'TOP_RIGHT',
      width_pct: 30,
      opacity: 0.5,
      start_ms: 1500,
      duration_ms: 2000,
    });
  });
});
