// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CMS_BLOCKS, cmsBlockProps } from '../src/cms-block';
import { EARN_SHOWCASE_COLUMNS, earnShowcaseImage } from '../src/earn-showcase';
import { bindEarnShowcaseParallax } from '../src/earn-showcase-dom';

describe('cmsBlockProps', () => {
  it('serialises plain props', () => {
    expect(JSON.parse(cmsBlockProps({ title: 'Hi', count: 2, nested: { a: [1] } }))).toEqual({
      title: 'Hi',
      count: 2,
      nested: { a: [1] },
    });
  });

  it('leaves out the translator, graphqlUrl, functions and Astro scope props', () => {
    const props = {
      t: () => 'x',
      graphqlUrl: 'https://api.test',
      onClick: () => undefined,
      'data-astro-cid-abc': '',
      label: 'kept',
    };
    expect(JSON.parse(cmsBlockProps(props))).toEqual({ label: 'kept' });
  });

  it('returns an empty object for no props and reads back through JSON.parse', () => {
    expect(cmsBlockProps({})).toBe('{}');
  });

  it('registers every block with its Astro component', () => {
    expect(CMS_BLOCKS['reel-slider']).toBe('ReelSlider.astro');
    expect(Object.keys(CMS_BLOCKS)).toHaveLength(6);
  });
});

describe('earnShowcaseImage', () => {
  it('builds a 4:5 cropped CDN URL for the width', () => {
    expect(earnShowcaseImage('https://images.pexels.com/photos/1/pexels-photo-1.jpeg', 200)).toBe(
      'https://images.pexels.com/photos/1/pexels-photo-1.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=200&h=250'
    );
  });

  it('rounds the height to a whole pixel', () => {
    expect(earnShowcaseImage('u', 101)).toContain('&h=126');
  });
});

describe('EARN_SHOWCASE_COLUMNS', () => {
  it('has nine columns, each with photos and a non-negative offset', () => {
    expect(EARN_SHOWCASE_COLUMNS).toHaveLength(9);
    for (const column of EARN_SHOWCASE_COLUMNS) {
      expect(column.photos.length).toBeGreaterThan(0);
      expect(column.offset).toBeGreaterThanOrEqual(0);
      for (const photo of column.photos) expect(photo).toMatch(/^https:\/\/images\.pexels\.com\/photos\/\d+\//);
    }
  });
});

describe('bindEarnShowcaseParallax', () => {
  const stubMedia = (fine: boolean, reduced: boolean) =>
    vi.stubGlobal(
      'matchMedia',
      (query: string) => ({ matches: query.includes('hover: hover') ? fine : reduced })
    );

  const section = () => {
    const node = document.createElement('section');
    node.getBoundingClientRect = () => ({ left: 100, width: 400 }) as DOMRect;
    return node;
  };

  afterEach(() => vi.unstubAllGlobals());

  it('leans the wall toward the pointer and recentres on leave', () => {
    stubMedia(true, false);
    const node = section();
    bindEarnShowcaseParallax(node);
    node.dispatchEvent(new MouseEvent('pointermove', { clientX: 500 }));
    expect(node.style.getPropertyValue('--earn-px')).toBe('6.00');
    node.dispatchEvent(new MouseEvent('pointermove', { clientX: 100 }));
    expect(node.style.getPropertyValue('--earn-px')).toBe('-6.00');
    node.dispatchEvent(new MouseEvent('pointermove', { clientX: 300 }));
    expect(node.style.getPropertyValue('--earn-px')).toBe('0.00');
    node.dispatchEvent(new Event('pointerleave'));
    expect(node.style.getPropertyValue('--earn-px')).toBe('0');
  });

  it('does nothing on touch devices', () => {
    stubMedia(false, false);
    const node = section();
    bindEarnShowcaseParallax(node);
    node.dispatchEvent(new MouseEvent('pointermove', { clientX: 500 }));
    expect(node.style.getPropertyValue('--earn-px')).toBe('');
  });

  it('does nothing for visitors who asked for reduced motion', () => {
    stubMedia(true, true);
    const node = section();
    bindEarnShowcaseParallax(node);
    node.dispatchEvent(new MouseEvent('pointermove', { clientX: 500 }));
    expect(node.style.getPropertyValue('--earn-px')).toBe('');
  });
});
