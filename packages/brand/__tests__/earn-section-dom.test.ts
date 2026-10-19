// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { applyEarnSection, mountEarnPill } from '../src/earn-section-dom';
import { EARN_SECTION_DEFAULTS, type EarnSection } from '../src/earn-section';

const config = (over: Partial<EarnSection> = {}): EarnSection => ({ ...EARN_SECTION_DEFAULTS, ...over });

let observed: (entries: Array<{ isIntersecting: boolean }>) => void;

beforeEach(() => {
  document.body.innerHTML = `
    <div data-earn-slot="BEFORE_FOOTER"></div>
    <section id="earn">
      <span data-earn-eyebrow>Earn</span>
      <h2><span data-earn-heading-main>Earn with Duncit</span><span data-earn-heading-muted>on your terms</span></h2>
      <p data-earn-text>Host pods and get paid.</p>
      <a data-earn-cta href="https://earnwith.duncit.com"><span data-earn-cta-label>Start earning</span></a>
      <div data-earn-tile><img src="/a.jpg" srcset="/a.jpg 1x" /></div>
      <div data-earn-tile><img src="/b.jpg" srcset="/b.jpg 1x" /></div>
    </section>
    <div id="pill" hidden><span data-earn-pill-label>Earn with Duncit</span><button data-earn-pill-close></button></div>`;
  class FakeObserver {
    constructor(cb: typeof observed) {
      observed = cb;
    }
    observe() {}
  }
  vi.stubGlobal('IntersectionObserver', FakeObserver);
  sessionStorage.clear();
  Object.defineProperty(globalThis, 'scrollY', { value: 0, configurable: true, writable: true });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const section = () => document.getElementById('earn') as HTMLElement;
const pill = () => document.getElementById('pill') as HTMLElement;
const text = (selector: string) => document.querySelector(selector)?.textContent;
const scrollTo = (y: number) => {
  globalThis.scrollY = y;
  globalThis.dispatchEvent(new Event('scroll'));
};

describe('applyEarnSection', () => {
  it('hides the whole section when the portal turned it off', () => {
    applyEarnSection(section(), config({ enabled: false, heading: 'Ignored' }));
    expect(section().hidden).toBe(true);
    expect(text('[data-earn-heading-main]')).toBe('Earn with Duncit');
  });

  it('applies the saved copy, accent and layout, keeping every blank field as built', () => {
    applyEarnSection(section(), config({ accent: 'TERTIARY', variant: 'SPLIT', heading: 'Host and earn', cta_label: 'Apply' }));
    expect(section().dataset.accent).toBe('tertiary');
    expect(section().dataset.variant).toBe('split');
    expect(text('[data-earn-heading-main]')).toBe('Host and earn');
    expect(text('[data-earn-cta-label]')).toBe('Apply');
    expect(text('[data-earn-eyebrow]')).toBe('Earn');
    expect(text('[data-earn-text]')).toBe('Host pods and get paid.');
  });

  it('points the CTA at an https link only', () => {
    const cta = () => document.querySelector<HTMLAnchorElement>('[data-earn-cta]')?.href;
    applyEarnSection(section(), config({ cta_url: 'javascript:alert(1)' }));
    expect(cta()).toBe('https://earnwith.duncit.com/');
    applyEarnSection(section(), config({ cta_url: 'https://earnwith.duncit.com/host' }));
    expect(cta()).toBe('https://earnwith.duncit.com/host');
  });

  it('swaps the tile photos for the portal images and drops the bundled srcset', () => {
    applyEarnSection(section(), config({ images: ['https://i/1.jpg'] }));
    const imgs = [...document.querySelectorAll('img')];
    expect(imgs.map((img) => img.getAttribute('src'))).toEqual(['https://i/1.jpg', 'https://i/1.jpg']);
    expect(imgs.every((img) => !img.hasAttribute('srcset'))).toBe(true);
  });

  it('styles a section built without copy, CTA or tiles, without throwing', () => {
    const bare = document.createElement('section');
    expect(() => applyEarnSection(bare, config({ heading: 'Host', cta_url: 'https://x.test', images: ['https://i/1.jpg'] }))).not.toThrow();
    expect(bare.dataset.accent).toBe('primary');
  });

  it('keeps the bundled photos when the portal has none', () => {
    applyEarnSection(section(), config());
    expect(document.querySelector('img')?.getAttribute('srcset')).toBe('/a.jpg 1x');
  });

  it('moves into the anchor for its position, and stays put when the page has no such anchor', () => {
    applyEarnSection(section(), config({ position: 'AFTER_DOWNLOAD' }));
    expect(section().parentElement).toBe(document.body);
    applyEarnSection(section(), config({ position: 'BEFORE_FOOTER' }));
    expect(section().parentElement?.dataset.earnSlot).toBe('BEFORE_FOOTER');
  });
});

describe('mountEarnPill', () => {
  it('stays hidden when the section or the pill is off, or the visitor already dismissed it', () => {
    mountEarnPill(pill(), section(), config({ enabled: false }));
    mountEarnPill(pill(), section(), config({ floating_enabled: false }));
    sessionStorage.setItem('duncit-earn-pill-dismissed', '1');
    mountEarnPill(pill(), section(), config());
    expect(pill().hidden).toBe(true);
  });

  it('shows past the hero, steps aside while the section is on screen, and uses the saved label', () => {
    mountEarnPill(pill(), section(), config({ floating_label: 'Earn now' }));
    expect(pill().hidden).toBe(false);
    expect(text('[data-earn-pill-label]')).toBe('Earn now');
    expect(pill().classList.contains('is-visible')).toBe(false);
    scrollTo(900);
    expect(pill().classList.contains('is-visible')).toBe(true);
    observed([{ isIntersecting: true }]);
    expect(pill().classList.contains('is-visible')).toBe(false);
    observed([{ isIntersecting: false }]);
    expect(pill().classList.contains('is-visible')).toBe(true);
  });

  it('shows a pill built without a label or a close button', () => {
    const bare = document.createElement('div');
    bare.hidden = true;
    mountEarnPill(bare, section(), config({ floating_label: 'Earn now' }));
    expect(bare.hidden).toBe(false);
  });

  it('closes for the rest of the visit once dismissed', () => {
    mountEarnPill(pill(), section(), config());
    scrollTo(900);
    pill().querySelector<HTMLButtonElement>('[data-earn-pill-close]')?.click();
    expect(pill().hidden).toBe(true);
    expect(pill().classList.contains('is-visible')).toBe(false);
    expect(sessionStorage.getItem('duncit-earn-pill-dismissed')).toBe('1');
  });

  it('still shows and closes when session storage is blocked, and reports the lost dismissal', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    mountEarnPill(pill(), section(), config());
    expect(pill().hidden).toBe(false);
    pill().querySelector<HTMLButtonElement>('[data-earn-pill-close]')?.click();
    expect(pill().hidden).toBe(true);
    expect(warn).toHaveBeenCalledWith('[earn-pill] dismissal not remembered', expect.any(Error));
  });
});
