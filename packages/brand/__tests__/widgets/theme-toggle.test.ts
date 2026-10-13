// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
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
