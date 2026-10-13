// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '../../src/widgets/site-header';

function build(): HTMLElement {
  document.body.innerHTML =
    '<header id="h"><button data-theme-toggle></button><i data-theme-icon></i></header>';
  return document.getElementById('h') as HTMLElement;
}

const scrollTo = (y: number) => {
  vi.stubGlobal('scrollY', y);
  window.dispatchEvent(new Event('scroll'));
};

beforeEach(() => {
  vi.unstubAllGlobals();
  vi.stubGlobal('scrollY', 0);
});

describe('site-header mount', () => {
  it('marks the header at-top at load and clears it once scrolled past 24px', () => {
    const header = build();
    mount(header);
    expect(header.classList.contains('at-top')).toBe(true);
    scrollTo(24);
    expect(header.classList.contains('at-top')).toBe(true);
    scrollTo(25);
    expect(header.classList.contains('at-top')).toBe(false);
    scrollTo(0);
    expect(header.classList.contains('at-top')).toBe(true);
  });

  it('starts solid when the page is already scrolled', () => {
    vi.stubGlobal('scrollY', 400);
    const header = build();
    mount(header);
    expect(header.classList.contains('at-top')).toBe(false);
  });

  it('wires the theme toggle inside the header', () => {
    const header = build();
    mount(header);
    expect(header.querySelector('[data-theme-toggle]')?.getAttribute('aria-pressed')).toBe('false');
  });

  it('mounts only once per root', () => {
    const header = build();
    const add = vi.spyOn(window, 'addEventListener');
    mount(header);
    mount(header);
    expect(add.mock.calls.filter(([type]) => type === 'scroll')).toHaveLength(1);
    add.mockRestore();
  });
});
