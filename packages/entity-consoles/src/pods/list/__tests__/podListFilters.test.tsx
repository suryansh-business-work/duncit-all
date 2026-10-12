import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { CategoryDoc } from '@duncit/category';
import {
  clubIdsInCategory,
  clubLocationLabel,
  clubScopeFilter,
  scopedClubIds,
  type PodFilterClub,
} from '../podListFilters';
import ClubLocationLabel from '../ClubLocationLabel';
import PodSpotsCell from '../PodSpotsCell';
import type { PodRow } from '../queries';

vi.mock('@duncit/ui', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  PodSeatsCell: ({ seats, bookings, total }: { seats: number; bookings: number; total: number }) => (
    <span data-testid="seats">{`${seats}/${bookings}/${total}`}</span>
  ),
}));

const clubs: PodFilterClub[] = [
  { id: 'c1', club_name: 'A', super_category_id: 'sup1', category_id: 'sub1', location_id: 'l1', locality: 'Gomti Nagar' },
  { id: 'c2', club_name: 'B', super_category_id: 'sup1', category_id: 'sub2', location_id: 'l1', locality: null },
  { id: 'c3', club_name: 'C', super_category_id: 'sup2', category_id: null, location_id: 'l9' },
];

const categories = [
  { id: 'sub1', level: 'SUB', parent_id: 'cat1' },
  { id: 'sub2', level: 'SUB', parent_id: 'cat2' },
  { id: 'cat1', level: 'CATEGORY', parent_id: 'sup1' },
] as unknown as CategoryDoc[];

const value = (over: Partial<Record<'super_id' | 'category_id' | 'sub_id', string>>) => ({
  super_id: '',
  super_name: '',
  category_id: '',
  category_name: '',
  sub_id: '',
  sub_name: '',
  ...over,
});

describe('clubIdsInCategory', () => {
  it('a Sub choice is the clubs in exactly that sub-category', () => {
    expect(clubIdsInCategory(clubs, categories, value({ sub_id: 'sub2' }))).toEqual(['c2']);
  });

  it('a Category choice is the clubs whose sub-category sits under it', () => {
    expect(clubIdsInCategory(clubs, categories, value({ category_id: 'cat1' }))).toEqual(['c1']);
  });

  it('ignores clubs with no sub-category when scoping by category', () => {
    expect(clubIdsInCategory(clubs, categories, value({ category_id: 'cat-none' }))).toEqual([]);
  });

  it('a Super choice is the clubs under that super category', () => {
    expect(clubIdsInCategory(clubs, categories, value({ super_id: 'sup1' }))).toEqual(['c1', 'c2']);
  });

  it('is null — no constraint at all — when nothing is chosen', () => {
    expect(clubIdsInCategory(clubs, categories, value({}))).toBeNull();
  });
});

describe('scopedClubIds', () => {
  it('passes the category scope straight through when no club is picked', () => {
    expect(scopedClubIds('', ['c1', 'c2'])).toEqual(['c1', 'c2']);
    expect(scopedClubIds('', null)).toBeNull();
  });

  it('narrows to the picked club when it is within the category scope or the scope is open', () => {
    expect(scopedClubIds('c2', ['c1', 'c2'])).toEqual(['c2']);
    expect(scopedClubIds('c2', null)).toEqual(['c2']);
  });

  it('is empty — nothing can match — when the picked club is outside the category', () => {
    expect(scopedClubIds('c3', ['c1', 'c2'])).toEqual([]);
  });
});

describe('clubScopeFilter', () => {
  it('adds no filter for an open scope', () => {
    expect(clubScopeFilter(null)).toBeUndefined();
  });

  it('uses eq for one club and in for several', () => {
    expect(clubScopeFilter(['c1'])).toEqual([{ field: 'club_id', op: 'eq', value: 'c1' }]);
    expect(clubScopeFilter(['c1', 'c2'])).toEqual([{ field: 'club_id', op: 'in', values: ['c1', 'c2'] }]);
  });

  it('keeps an empty scope as an in-filter so the caller can answer without asking', () => {
    expect(clubScopeFilter([])).toEqual([{ field: 'club_id', op: 'in', values: [] }]);
  });
});

describe('clubLocationLabel', () => {
  const locations = [{ id: 'l1', city: 'Lucknow' }];

  it('puts the locality inside the city', () => {
    expect(clubLocationLabel(clubs[0], locations)).toBe('Gomti Nagar, Lucknow');
  });

  it('is just the city for a club with no locality', () => {
    expect(clubLocationLabel(clubs[1], locations)).toBe('Lucknow');
  });

  it('is empty when the club\'s location is unknown', () => {
    expect(clubLocationLabel(clubs[2], locations)).toBe('');
  });
});

describe('ClubLocationLabel', () => {
  it('is only the name when there is no location', () => {
    const { container } = render(<ClubLocationLabel name="Who Even Are We?" location="" />);
    expect(container).toHaveTextContent(/^Who Even Are We\?$/);
  });

  it('adds the pin and the location after the name', () => {
    const { container } = render(<ClubLocationLabel name="Who Even Are We?" location="Gomti Nagar, Lucknow" />);
    expect(container).toHaveTextContent('Who Even Are We? | Gomti Nagar, Lucknow');
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });
});

describe('PodSpotsCell', () => {
  const t = (key: string, options?: { vars?: Record<string, unknown> }) =>
    `${key}:${String(options?.vars?.min)}`;
  const row = (over: Partial<PodRow>) =>
    ({ id: 'p1', pod_attendees: ['a'], seats_taken: 3, no_of_spots: 8, ...over }) as PodRow;

  it('shows seats, bookings and capacity from the shared cell', () => {
    render(<PodSpotsCell pod={row({})} minPax={0} t={t} />);
    expect(screen.getByTestId('seats')).toHaveTextContent('3/1/8');
    expect(screen.queryByTestId('pods-below-min-pax-p1')).not.toBeInTheDocument();
  });

  it('flags a pod short of its activity minimum with a named reason', () => {
    render(<PodSpotsCell pod={row({})} minPax={5} t={t} />);
    expect(screen.getByTestId('pods-below-min-pax-p1')).toBeInTheDocument();
    expect(screen.getByTitle('admin.pods.belowMinPax:5')).toBeInTheDocument();
  });

  it('does not flag a pod that has reached the minimum', () => {
    render(<PodSpotsCell pod={row({ seats_taken: 5 })} minPax={5} t={t} />);
    expect(screen.queryByTestId('pods-below-min-pax-p1')).not.toBeInTheDocument();
  });
});
