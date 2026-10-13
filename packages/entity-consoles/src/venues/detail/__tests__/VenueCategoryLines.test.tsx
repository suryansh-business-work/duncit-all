import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import VenueCategoryLines from '../VenueCategoryLines';
import { EMPTY } from '../venue-values';
import { makeVenue } from './fixtures';

const BLANK_CATEGORY = {
  super_category_id: null,
  category_id: null,
  sub_category_id: null,
  super_category_name: '',
  category_name: '',
  sub_category_name: '',
};

describe('VenueCategoryLines', () => {
  it('lists every category the venue is filed under, primary first', () => {
    render(<VenueCategoryLines venue={makeVenue()} />);

    expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      'For You › Games › Board Games',
      'For You › Quizzes › Pub Quiz',
    ]);
  });

  it('reads the lone legacy category of a venue stored before the list existed', () => {
    render(<VenueCategoryLines venue={makeVenue({ venue_categories: [] })} />);

    expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      'For You › Games › Board Games',
    ]);
  });

  it('reads the dash, and draws no list, for a venue filed under no category', () => {
    render(<VenueCategoryLines venue={makeVenue({ venue_categories: [], venue_category: BLANK_CATEGORY })} />);

    expect(screen.getByText(EMPTY)).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('draws the lines in the size it is asked for', () => {
    render(<VenueCategoryLines venue={makeVenue()} variant="caption" />);

    for (const line of screen.getAllByRole('listitem')) {
      expect(line).toHaveClass('MuiTypography-caption');
    }
  });
});
