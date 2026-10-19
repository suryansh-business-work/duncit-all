// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { THEME_STORAGE_KEY, wireThemeToggle } from '../../src/widgets/theme-toggle';

beforeEach(() => {
  document.body.innerHTML = '<div id="s"><button data-theme-toggle></button><i data-theme-icon></i></div>';
  delete document.documentElement.dataset.theme;
  localStorage.clear();
});

const scope = () => document.getElementById('s') as HTMLElement;
const toggle = () => document.querySelector('[data-theme-toggle]') as HTMLElement;
const icon = () => document.querySelector('[data-theme-icon]') as HTMLElement;

describe('wireThemeToggle', () => {
  it('paints the icon for the current (light) theme: a moon, not pressed', () => {
    wireThemeToggle(scope());
    expect(toggle().getAttribute('aria-pressed')).toBe('false');
    expect(icon().className).toContain('fa-moon');
  });

  it('paints a sun when the page is already dark', () => {
    document.documentElement.dataset.theme = 'dark';
    wireThemeToggle(scope());
    expect(toggle().getAttribute('aria-pressed')).toBe('true');
    expect(icon().className).toContain('fa-sun');
  });

  it('flips light to dark on press, remembers it and repaints', () => {
    wireThemeToggle(scope());
    toggle().click();
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
    expect(icon().className).toContain('fa-sun');
  });

  it('flips dark back to light', () => {
    document.documentElement.dataset.theme = 'dark';
    wireThemeToggle(scope());
    toggle().click();
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
    expect(toggle().getAttribute('aria-pressed')).toBe('false');
  });

  it('wires a button once, so wiring the page again never flips the theme twice', () => {
    wireThemeToggle(scope());
    wireThemeToggle(scope());
    toggle().click();
    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  it('keeps every toggle on the page in step, each with its own icon', () => {
    document.body.innerHTML = `<div id="s">
      <button id="top" data-theme-toggle><i data-theme-icon></i></button>
      <button id="drawer" data-theme-toggle><i data-theme-icon></i></button></div>`;
    wireThemeToggle(scope());
    document.getElementById('top')?.click();
    const icons = [...document.querySelectorAll('[data-theme-icon]')].map((i) => i.className);
    expect(icons).toEqual(['fa-solid fa-sun text-sm', 'fa-solid fa-sun text-sm']);
    expect(document.getElementById('drawer')?.getAttribute('aria-pressed')).toBe('true');
  });

  it('still changes the theme when storage is blocked, and reports it', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    wireThemeToggle(scope());
    toggle().click();
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(warn).toHaveBeenCalledWith('[theme-toggle] choice not remembered', expect.any(Error));
    setItem.mockRestore();
    warn.mockRestore();
  });

  it('does nothing when the icon is missing', () => {
    document.body.innerHTML = '<div id="s"><button data-theme-toggle></button></div>';
    expect(() => wireThemeToggle(scope())).not.toThrow();
    toggle().click();
    expect(document.documentElement.dataset.theme).toBeUndefined();
  });

  it('does nothing when the button is missing', () => {
    document.body.innerHTML = '<div id="s"><i data-theme-icon></i></div>';
    wireThemeToggle(scope());
    expect(icon().className).toBe('');
  });
});
