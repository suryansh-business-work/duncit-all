import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import VenueOtherCategoriesNote from './VenueOtherCategoriesNote';

const category = (superName: string, categoryName: string, subName: string) => ({
  super_category_id: `sup-${superName}`,
  category_id: `cat-${categoryName}`,
  sub_category_id: `sub-${subName}`,
  super_category_name: superName,
  category_name: categoryName,
  sub_category_name: subName,
});
const CRICKET = category('Sports', 'Cricket', 'Box Cricket');
const YOGA = category('Fitness', 'Yoga', 'Hatha');
const OPEN_MIC = category('Music', 'Live', 'Open mic');

describe('VenueOtherCategoriesNote', () => {
  it('names every category after the primary, and what changing the primary does to them', () => {
    render(<VenueOtherCategoriesNote venue={{ venue_category: CRICKET, venue_categories: [CRICKET, YOGA, OPEN_MIC] }} />);

    const note = screen.getByTestId('venue-other-categories');
    expect(note).toHaveTextContent('This venue also hosts in: Fitness › Yoga › Hatha, Music › Live › Open mic.');
    expect(note).toHaveTextContent('removes these other categories');
    // The primary is what the dialog's own picker shows: it is not repeated here.
    expect(note).not.toHaveTextContent('Box Cricket');
  });

  it('says nothing for a venue in one category', () => {
    render(<VenueOtherCategoriesNote venue={{ venue_category: CRICKET, venue_categories: [CRICKET] }} />);
    expect(screen.queryByTestId('venue-other-categories')).not.toBeInTheDocument();
  });

  it('says nothing for a venue stored before the list existed, a venue with no category, or no venue', () => {
    const { rerender } = render(<VenueOtherCategoriesNote venue={{ venue_category: CRICKET }} />);
    expect(screen.queryByTestId('venue-other-categories')).not.toBeInTheDocument();

    rerender(<VenueOtherCategoriesNote venue={{ venue_categories: [] }} />);
    expect(screen.queryByTestId('venue-other-categories')).not.toBeInTheDocument();

    rerender(<VenueOtherCategoriesNote venue={null} />);
    expect(screen.queryByTestId('venue-other-categories')).not.toBeInTheDocument();
  });
});
