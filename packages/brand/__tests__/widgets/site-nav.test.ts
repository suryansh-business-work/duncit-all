// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { mount } from '../../src/widgets/site-nav';

function build(withBackdrop = true): HTMLElement {
  document.body.innerHTML = `
    <button data-nav-toggle id="open"><span id="inner"></span></button>
    ${withBackdrop ? '<div data-nav-backdrop class="opacity-0 pointer-events-none"></div>' : ''}
    <nav id="nav" class="-translate-x-full" aria-hidden="true"><button data-nav-close id="close"></button></nav>
    <p id="other">x</p>`;
  return document.getElementById('nav') as HTMLElement;
}

const el = (id: string) => document.getElementById(id) as HTMLElement;

beforeEach(() => {
  document.body.style.overflow = '';
});

describe('site-nav mount', () => {
  it('opens on a toggle click (also from a child), locking body scroll', () => {
    const nav = build();
    mount(nav);
    el('inner').click();
    expect(nav.classList.contains('-translate-x-full')).toBe(false);
    expect(nav.getAttribute('aria-hidden')).toBe('false');
    expect(document.body.style.overflow).toBe('hidden');
    const backdrop = document.querySelector('[data-nav-backdrop]') as HTMLElement;
    expect(backdrop.classList.contains('opacity-100')).toBe(true);
    expect(backdrop.classList.contains('pointer-events-none')).toBe(false);
  });

  it('closes via the close button, restoring scroll and the backdrop', () => {
    const nav = build();
    mount(nav);
    el('open').click();
    el('close').click();
    expect(nav.classList.contains('-translate-x-full')).toBe(true);
    expect(nav.getAttribute('aria-hidden')).toBe('true');
    expect(document.body.style.overflow).toBe('');
    const backdrop = document.querySelector('[data-nav-backdrop]') as HTMLElement;
    expect(backdrop.classList.contains('opacity-0')).toBe(true);
    expect(backdrop.classList.contains('opacity-100')).toBe(false);
  });

  it('closes when the backdrop itself is clicked', () => {
    const nav = build();
    mount(nav);
    el('open').click();
    (document.querySelector('[data-nav-backdrop]') as HTMLElement).click();
    expect(nav.getAttribute('aria-hidden')).toBe('true');
  });

  it('closes on Escape and ignores other keys', () => {
    const nav = build();
    mount(nav);
    el('open').click();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(nav.getAttribute('aria-hidden')).toBe('false');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(nav.getAttribute('aria-hidden')).toBe('true');
  });

  it('ignores clicks elsewhere and clicks whose target is not an element', () => {
    const nav = build();
    mount(nav);
    el('open').click();
    el('other').click();
    expect(nav.getAttribute('aria-hidden')).toBe('false');
    document.dispatchEvent(new Event('click'));
    expect(nav.getAttribute('aria-hidden')).toBe('false');
  });

  it('works without a backdrop', () => {
    const nav = build(false);
    mount(nav);
    el('open').click();
    expect(nav.getAttribute('aria-hidden')).toBe('false');
    el('close').click();
    expect(nav.getAttribute('aria-hidden')).toBe('true');
  });

  it('mounts once per root', () => {
    const nav = build();
    mount(nav);
    mount(nav);
    expect(nav.dataset.cmsMounted).toBe('true');
    el('open').click();
    expect(nav.getAttribute('aria-hidden')).toBe('false');
  });
});
