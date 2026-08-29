import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import ClubContentSections from '../ClubContentSections';
import type { ClubDetail } from '../types';

const baseClub: ClubDetail = {
  id: 'c1',
  club_id: 'bengaluru-hikers',
  club_name: 'Bengaluru Hikers',
  is_verified: true,
  is_active: true,
  followers_count: 0,
  matched_venues_count: 0,
  rating: 0,
  ratings_count: 0,
  who_we_are: [],
  what_we_do: [],
  perks: [],
  values: [],
  faqs: [],
  club_feature_images_and_videos: [],
  club_moments: [],
  admin_user_ids: [],
  club_admins: [],
};

describe('ClubContentSections', () => {
  it('renders nothing when there are no bullet blocks and no FAQs', () => {
    const { container } = render(<ClubContentSections club={baseClub} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders only the bullet blocks that have content', () => {
    render(
      <ClubContentSections
        club={{
          ...baseClub,
          who_we_are: ['Weekend explorers'],
          what_we_do: [],
          perks: ['Free trail snacks'],
          values: [],
        }}
      />,
    );
    expect(screen.getByText('WHO WE ARE')).toBeInTheDocument();
    expect(screen.getByText('Weekend explorers')).toBeInTheDocument();
    expect(screen.getByText('PERKS')).toBeInTheDocument();
    expect(screen.getByText('Free trail snacks')).toBeInTheDocument();
    expect(screen.queryByText('WHAT WE DO')).not.toBeInTheDocument();
    expect(screen.queryByText('VALUES')).not.toBeInTheDocument();
    expect(screen.queryByText('FAQS')).not.toBeInTheDocument();
  });

  it('renders FAQs with no bullet blocks above (mt: 0 branch), each expandable', () => {
    render(
      <ClubContentSections
        club={{ ...baseClub, faqs: [{ question: 'When do we meet?', answer: 'Every Sunday morning.' }] }}
      />,
    );
    expect(screen.getByText('FAQS')).toBeInTheDocument();
    expect(screen.getByText('When do we meet?')).toBeInTheDocument();
    // MUI's Accordion keeps AccordionDetails in the DOM (collapsed via CSS), so
    // the answer is already queryable without needing to expand it.
    expect(screen.getByText('Every Sunday morning.')).toBeInTheDocument();

    fireEvent.click(screen.getByText('When do we meet?'));
    expect(screen.getByText('Every Sunday morning.')).toBeInTheDocument();
  });

  it('renders bullet blocks AND FAQs together (mt: 2 branch)', () => {
    render(
      <ClubContentSections
        club={{
          ...baseClub,
          who_we_are: ['Weekend explorers'],
          faqs: [{ question: 'Any fees?', answer: 'No, it is free.' }],
        }}
      />,
    );
    expect(screen.getByText('WHO WE ARE')).toBeInTheDocument();
    expect(screen.getByText('FAQS')).toBeInTheDocument();
    expect(screen.getByText('Any fees?')).toBeInTheDocument();
  });

  it('renders multiple FAQ entries, each in its own accordion', () => {
    render(
      <ClubContentSections
        club={{
          ...baseClub,
          faqs: [
            { question: 'Q1?', answer: 'A1.' },
            { question: 'Q2?', answer: 'A2.' },
          ],
        }}
      />,
    );
    expect(screen.getByText('Q1?')).toBeInTheDocument();
    expect(screen.getByText('Q2?')).toBeInTheDocument();
    expect(screen.getByText('A1.')).toBeInTheDocument();
    expect(screen.getByText('A2.')).toBeInTheDocument();
  });
});
