import { afterEach, describe, expect, it } from 'vitest';
import { usePageTitle } from '../../lib/usePageTitle';
import { renderHookWithProviders } from '../test-utils';

afterEach(() => {
  document.title = '';
  document.head.querySelector('meta[name="description"]')?.remove();
});

describe('usePageTitle', () => {
  it("suffixes the page's title with the site name from the settings", () => {
    renderHookWithProviders(() => usePageTitle('Discover'), { settings: { site_name: 'Lite Events' } });
    expect(document.title).toBe('Discover | Lite Events');
  });

  it('writes the description for link previews when there is one', () => {
    renderHookWithProviders(() => usePageTitle('Garden Party', 'Bring a picnic blanket.'));
    expect(document.title).toBe('Garden Party | Duncit Lite');
    expect(document.head.querySelector('meta[name="description"]')?.getAttribute('content')).toBe('Bring a picnic blanket.');
  });

  it('keeps the previous title while the page has no name yet', () => {
    document.title = 'Discover | Duncit Lite';
    renderHookWithProviders(() => usePageTitle(''));
    expect(document.title).toBe('Discover | Duncit Lite');
  });

  it('follows a title that changes', () => {
    let title = 'Loading';
    const { rerender } = renderHookWithProviders(() => usePageTitle(title));
    expect(document.title).toBe('Loading | Duncit Lite');
    title = 'Garden Party';
    rerender();
    expect(document.title).toBe('Garden Party | Duncit Lite');
  });
});
