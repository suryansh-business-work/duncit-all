import { describe, it, expect } from 'vitest';
import type { CSSObject } from '@mui/material/styles';
import { focusVisibleGlobalCss, reducedMotionGlobalCss } from '../src/global-css';

describe('focusVisibleGlobalCss', () => {
  const css = focusVisibleGlobalCss('#c62226');
  const [selector] = Object.keys(css);

  it('draws one 2px ring at a 2px offset in the given colour', () => {
    expect(Object.keys(css)).toHaveLength(1);
    expect(css[selector]).toEqual({ outline: '2px solid #c62226', outlineOffset: 2 });
  });

  it('covers native controls, ARIA widgets and every MUI ButtonBase', () => {
    for (const target of [
      'a:focus-visible',
      'button:focus-visible',
      '[role="tab"]:focus-visible',
      '[role="switch"]:focus-visible',
      '[tabindex]:not([tabindex="-1"]):focus-visible',
      '.MuiButtonBase-root.Mui-focusVisible',
    ]) {
      expect(selector.split(', ')).toContain(target);
    }
  });

  it('never targets a programmatic tabindex="-1" focus target', () => {
    expect(selector).not.toContain('[tabindex="-1"]:focus-visible');
  });
});

describe('reducedMotionGlobalCss', () => {
  it('collapses motion under prefers-reduced-motion but spares progress indicators', () => {
    const media = reducedMotionGlobalCss['@media (prefers-reduced-motion: reduce)'] as CSSObject;
    const [selector] = Object.keys(media);
    expect(selector).toContain(':not([role="progressbar"], [role="progressbar"] *)');
    expect(media[selector]).toEqual({
      animationDuration: '0.01ms !important',
      animationIterationCount: '1 !important',
      transitionDuration: '0.01ms !important',
      scrollBehavior: 'auto !important',
    });
  });
});
