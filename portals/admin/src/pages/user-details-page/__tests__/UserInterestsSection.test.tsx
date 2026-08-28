import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import UserInterestsSection from '../UserInterestsSection';
import { renderWithProviders } from './testkit';

describe('UserInterestsSection — no interests', () => {
  it('shows the empty copy when interest_categories is missing entirely', () => {
    renderWithProviders(<UserInterestsSection user={{}} />);

    expect(screen.getByText('No survey interests saved yet.')).toBeInTheDocument();
  });

  it('shows the empty copy when interest_categories is an empty array', () => {
    renderWithProviders(<UserInterestsSection user={{ interest_categories: [] }} />);

    expect(screen.getByText('No survey interests saved yet.')).toBeInTheDocument();
  });

  it('does not show the "stored by category ID" footnote without interest_category_ids', () => {
    renderWithProviders(<UserInterestsSection user={{ interest_categories: [] }} />);

    expect(screen.queryByText('Stored by category ID for dynamic category updates.')).toBeNull();
  });
});

describe('UserInterestsSection — with interests', () => {
  it('labels each chip with the category name and its human level', () => {
    renderWithProviders(
      <UserInterestsSection
        user={{
          interest_categories: [
            { id: 'c1', name: 'Fitness', level: 'SUPER' },
            { id: 'c2', name: 'Yoga', level: 'CATEGORY' },
            { id: 'c3', name: 'Power Yoga', level: 'SUB' },
          ],
        }}
      />,
    );

    expect(screen.getByText('Fitness · Super')).toBeInTheDocument();
    expect(screen.getByText('Yoga · Category')).toBeInTheDocument();
    expect(screen.getByText('Power Yoga · Subcategory')).toBeInTheDocument();
  });

  it('falls back to the raw level string when it is not one of the known three', () => {
    renderWithProviders(
      <UserInterestsSection
        user={{ interest_categories: [{ id: 'c9', name: 'Mystery', level: 'WEIRD' }] }}
      />,
    );

    expect(screen.getByText('Mystery · WEIRD')).toBeInTheDocument();
  });

  it('colors only the SUPER level chip primary', () => {
    renderWithProviders(
      <UserInterestsSection
        user={{
          interest_categories: [
            { id: 'c1', name: 'Fitness', level: 'SUPER' },
            { id: 'c2', name: 'Yoga', level: 'CATEGORY' },
          ],
        }}
      />,
    );

    expect(screen.getByText('Fitness · Super').closest('.MuiChip-root')).toHaveClass('MuiChip-colorPrimary');
    expect(screen.getByText('Yoga · Category').closest('.MuiChip-root')).toHaveClass('MuiChip-colorDefault');
  });

  it('shows the "stored by category ID" footnote once interest_category_ids has entries', () => {
    renderWithProviders(
      <UserInterestsSection
        user={{
          interest_categories: [{ id: 'c1', name: 'Fitness', level: 'SUPER' }],
          interest_category_ids: ['c1'],
        }}
      />,
    );

    expect(screen.getByText('Stored by category ID for dynamic category updates.')).toBeInTheDocument();
  });
});
