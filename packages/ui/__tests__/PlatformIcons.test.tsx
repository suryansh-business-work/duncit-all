import { describe, it, expect } from 'vitest';
import { render, renderHook, screen } from '@testing-library/react';
import { PlatformIcons } from '../src/platform-icons/PlatformIcons';
import { orderedPlatforms, usePlatformText } from '../src/platform-icons/platforms';

describe('PlatformIcons', () => {
  it('shows only the platforms used, in display order, named by platform', () => {
    render(<PlatformIcons platforms={['WEB', 'ANDROID']} testId="row" />);
    const group = screen.getByRole('group', { name: 'Platforms used' });
    const icons = screen.getAllByRole('img');
    expect(group).toHaveAttribute('data-testid', 'row');
    expect(icons.map((icon) => icon.getAttribute('aria-label'))).toEqual(['Android', 'Web']);
    expect(screen.queryByTestId('row-IOS')).toBeNull();
    // Decorative state only: nothing to operate, so nothing in the tab order.
    for (const icon of icons) expect(icon).not.toHaveAttribute('tabindex');
  });

  it('says none were recorded when the used variant has nothing to show', () => {
    render(<PlatformIcons platforms={null} testId="row" />);
    expect(screen.getByTestId('row-empty')).toHaveTextContent('None recorded yet');
    expect(screen.queryByRole('group')).toBeNull();
  });

  it('shows all three in the all variant, the used ones dark and the rest dimmed, with the state in the name', () => {
    render(<PlatformIcons platforms={['IOS']} variant="all" testId="card" />);
    expect(screen.getByRole('img', { name: 'Android: not used' })).toHaveAttribute('data-used', 'false');
    expect(screen.getByRole('img', { name: 'iOS: used' })).toHaveAttribute('data-used', 'true');
    expect(screen.getByRole('img', { name: 'Web: not used' })).toHaveAttribute('data-used', 'false');
  });

  it('keeps the all variant even when nothing was used, so every account reads the same', () => {
    render(<PlatformIcons platforms={[]} variant="all" testId="card" />);
    expect(screen.getAllByRole('img')).toHaveLength(3);
    expect(screen.queryByTestId('card-empty')).toBeNull();
  });
});

describe('platform helpers', () => {
  it('orders, de-duplicates and drops values that are not platforms', () => {
    expect(orderedPlatforms(['WEB', 'IOS', 'WEB', 'TV'])).toEqual(['IOS', 'WEB']);
    expect(orderedPlatforms(undefined)).toEqual([]);
  });

  it('gives a table its filter options and export text', () => {
    const { result } = renderHook(() => usePlatformText());
    expect(result.current.options).toEqual([
      { value: 'ANDROID', label: 'Android' },
      { value: 'IOS', label: 'iOS' },
      { value: 'WEB', label: 'Web' },
    ]);
    expect(result.current.valueText(['WEB', 'ANDROID'])).toBe('Android, Web');
    expect(result.current.valueText(null)).toBe('');
  });
});
