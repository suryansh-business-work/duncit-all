import { describe, it, expect } from 'vitest';
import type { CSSObject } from '@mui/material/styles';
import { mergeCss, mergeSlot, type SlotStyle } from '../src/merge';

describe('mergeCss', () => {
  it('returns the extra object untouched when there is no base', () => {
    const extra: CSSObject = { opacity: 0.75 };
    expect(mergeCss(undefined, extra)).toBe(extra);
  });

  it('lets extra win on plain (non-selector) keys', () => {
    const merged = mergeCss({ color: '#1F2937', padding: 8 }, { color: '#E11D48' });
    expect(merged).toEqual({ color: '#E11D48', padding: 8 });
  });

  it('merges one level deep through an & selector both sides carry', () => {
    const merged = mergeCss(
      { '&:active': { outline: 'none' } },
      { '&:active': { transform: 'scale(0.96)' } }
    );
    expect(merged['&:active']).toEqual({ outline: 'none', transform: 'scale(0.96)' });
  });

  it('keeps the base &:hover when extra adds a sibling &:active', () => {
    const merged = mergeCss(
      { '&:hover': { opacity: 0.9 } },
      { '&:active': { transform: 'scale(0.96)' } }
    );
    expect(merged).toEqual({
      '&:hover': { opacity: 0.9 },
      '&:active': { transform: 'scale(0.96)' },
    });
  });

  it('merges one level deep through an @ selector (media query)', () => {
    const merged = mergeCss(
      { '@media (min-width: 600px)': { padding: 12 } },
      { '@media (min-width: 600px)': { margin: 4 } }
    );
    expect(merged['@media (min-width: 600px)']).toEqual({ padding: 12, margin: 4 });
  });

  it('replaces (not merges) a nested object under a non-selector key', () => {
    const merged = mergeCss(
      { variants: [{ props: { variant: 'contained' } }] } as CSSObject,
      { variants: [{ props: { variant: 'text' } }] } as CSSObject
    );
    expect(merged.variants).toEqual([{ props: { variant: 'text' } }]);
  });

  it('replaces a selector value when the base side is not an object', () => {
    const merged = mergeCss({ '&:active': 'inherit' } as CSSObject, {
      '&:active': { opacity: 0.75 },
    });
    expect(merged['&:active']).toEqual({ opacity: 0.75 });
  });

  it('replaces a selector value when the base side is null', () => {
    const merged = mergeCss({ '&:active': null } as unknown as CSSObject, {
      '&:active': { opacity: 0.75 },
    });
    expect(merged['&:active']).toEqual({ opacity: 0.75 });
  });

  it('replaces a selector value when the extra side is not an object', () => {
    const merged = mergeCss(
      { '&:active': { opacity: 0.75 } },
      { '&:active': 'unset' } as CSSObject
    );
    expect(merged['&:active']).toBe('unset');
  });

  it('replaces a selector value when the extra side is null', () => {
    const merged = mergeCss(
      { '&:active': { opacity: 0.75 } },
      { '&:active': null } as unknown as CSSObject
    );
    expect(merged['&:active']).toBeNull();
  });

  it('does not mutate the base object', () => {
    const base: CSSObject = { '&:active': { outline: 'none' } };
    mergeCss(base, { '&:active': { opacity: 0.75 } });
    expect(base).toEqual({ '&:active': { outline: 'none' } });
  });
});

describe('mergeSlot', () => {
  it('merges a plain object slot like mergeCss', () => {
    const merged = mergeSlot({ color: '#1F2937' }, { opacity: 0.75 });
    expect(merged).toEqual({ color: '#1F2937', opacity: 0.75 });
  });

  it('returns the extra when the slot was undefined', () => {
    const extra: CSSObject = { opacity: 0.75 };
    expect(mergeSlot(undefined, extra)).toBe(extra);
  });

  it('wraps a function slot and merges its result when invoked', () => {
    const base: SlotStyle = () => ({ color: '#1F2937', '&:active': { outline: 'none' } });
    const merged = mergeSlot(base, { '&:active': { transform: 'scale(0.96)' } });
    expect(typeof merged).toBe('function');
    const resolved = (merged as (props: never) => CSSObject)(undefined as never);
    expect(resolved).toEqual({
      color: '#1F2937',
      '&:active': { outline: 'none', transform: 'scale(0.96)' },
    });
  });
});
