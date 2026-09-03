import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import ClubAdminCategoryCard from './ClubAdminCategoryCard';
import type { ClubAdminCategoryRow } from '@duncit/utils';

afterEach(cleanup);

const rows: ClubAdminCategoryRow[] = [
  { category_id: 'cat-tennis', name: 'Tennis', super_category: 'Sports', clubs: 2, pods: 14 },
  { category_id: 'cat-pottery', name: 'Pottery', super_category: null, clubs: 1, pods: 3 },
];

describe('ClubAdminCategoryCard', () => {
  it('names every category the admin runs clubs in, with its club and pod counts', () => {
    render(<ClubAdminCategoryCard categories={rows} loading={false} />);
    expect(screen.getByText('Your Categories')).toBeTruthy();
    expect(screen.getByText('Tennis')).toBeTruthy();
    expect(screen.getByText('Sports')).toBeTruthy();
    expect(screen.getByText('Pottery')).toBeTruthy();
    expect(screen.getByText('14')).toBeTruthy();
    expect(screen.getAllByText('Clubs')).toHaveLength(2);
    expect(screen.getAllByText('Pods')).toHaveLength(2);
  });

  it('says so when no assigned club carries a category', () => {
    render(<ClubAdminCategoryCard categories={[]} loading={false} />);
    expect(screen.getByText('No category is set on your clubs yet.')).toBeTruthy();
    expect(screen.queryByText('Tennis')).toBeNull();
  });

  it('shows placeholders rather than the empty state while the dashboard loads', () => {
    render(<ClubAdminCategoryCard categories={[]} loading />);
    expect(screen.queryByText('No category is set on your clubs yet.')).toBeNull();
    expect(document.querySelectorAll('.MuiSkeleton-root')).toHaveLength(4);
  });
});
