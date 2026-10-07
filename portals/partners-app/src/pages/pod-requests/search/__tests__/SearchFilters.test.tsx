import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, configure, fireEvent, screen } from '@testing-library/react';
import SearchFilters from '../SearchFilters';
import { renderWithProviders } from '../../../../__tests__/render';
import { scriptedLink } from '../../../../__tests__/groupC-link';
import { category } from '../../__tests__/fixtures';

configure({ asyncUtilTimeout: 5000 });
afterEach(cleanup);

const categories = {
  categories: [
    category('cat-yoga', 'Yoga'),
    category('cat-badminton', 'Badminton'),
    { ...category('sub-doubles', 'Doubles'), level: 'SUB' },
  ],
};

const mount = (props: { radiusKm?: number; categoryIds?: string[] } = {}) => {
  const onRadius = vi.fn();
  const onCategories = vi.fn();
  const view = renderWithProviders(
    <SearchFilters
      radiusKm={props.radiusKm ?? 5}
      onRadius={onRadius}
      categoryIds={props.categoryIds ?? []}
      onCategories={onCategories}
    />,
    { link: scriptedLink({ AdminCategories: categories }) },
  );
  return { onRadius, onCategories, view };
};

const chip = (name: string) => screen.getByRole('button', { name });

describe('SearchFilters', () => {
  it('shows the radius and offers every category, "All categories" pressed when none is chosen', async () => {
    mount();

    expect(screen.getByText('Radius: 5 km')).toBeTruthy();
    expect(screen.getByRole('slider', { name: 'Radius: 5 km' }).getAttribute('aria-valuetext')).toBe('5 km');
    expect(await screen.findByRole('button', { name: 'Badminton' })).toBeTruthy();
    expect(chip('Yoga')).toBeTruthy();
    // Only the middle level is a search category.
    expect(screen.queryByRole('button', { name: 'Doubles' })).toBeNull();
    expect(chip('All categories').getAttribute('aria-pressed')).toBe('true');
    expect(chip('Yoga').getAttribute('aria-pressed')).toBe('false');
  });

  it('adds a category to the selection and removes it on a second press', async () => {
    const first = mount({ categoryIds: ['cat-yoga'] });

    expect((await screen.findByRole('button', { name: 'Yoga' })).getAttribute('aria-pressed')).toBe('true');
    expect(chip('All categories').getAttribute('aria-pressed')).toBe('false');

    fireEvent.click(chip('Badminton'));
    expect(first.onCategories).toHaveBeenLastCalledWith(['cat-yoga', 'cat-badminton']);
    fireEvent.click(chip('Yoga'));
    expect(first.onCategories).toHaveBeenLastCalledWith([]);
  });

  it('clears the selection from "All categories"', async () => {
    const { onCategories } = mount({ categoryIds: ['cat-yoga', 'cat-badminton'] });

    fireEvent.click(await screen.findByRole('button', { name: 'All categories' }));
    expect(onCategories).toHaveBeenCalledWith([]);
  });

  it('commits a radius step from the keyboard', () => {
    const { onRadius } = mount();

    fireEvent.keyDown(screen.getByRole('slider'), { key: 'ArrowRight' });

    expect(onRadius).toHaveBeenCalledWith(5.5);
    expect(screen.getByText('Radius: 5.5 km')).toBeTruthy();
  });

  it('never commits past the 10 km cap', () => {
    const { onRadius } = mount({ radiusKm: 10 });

    fireEvent.keyDown(screen.getByRole('slider'), { key: 'End' });

    expect(onRadius).toHaveBeenLastCalledWith(10);
    expect(screen.getByText('Radius: 10 km')).toBeTruthy();
  });

  it('follows a radius changed from outside (the empty state widening it)', () => {
    const { view, onRadius, onCategories } = mount();

    view.rerenderWith(
      <SearchFilters radiusKm={10} onRadius={onRadius} categoryIds={[]} onCategories={onCategories} />,
    );

    expect(screen.getByText('Radius: 10 km')).toBeTruthy();
  });
});
