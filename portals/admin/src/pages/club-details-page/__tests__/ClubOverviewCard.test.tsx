import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import ClubOverviewCard from '../ClubOverviewCard';
import type { ClubDetail } from '../types';

const baseClub: ClubDetail = {
  id: 'c1',
  club_id: 'bengaluru-hikers',
  club_name: 'Bengaluru Hikers',
  club_description: null,
  is_verified: true,
  is_active: true,
  locality: null,
  followers_count: 120,
  matched_venues_count: 5,
  rating: 0,
  ratings_count: 0,
  club_whats_app_community_link: null,
  club_whats_app_group_link: null,
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

describe('ClubOverviewCard', () => {
  it('shows the placeholder copy when there is no description', () => {
    render(<ClubOverviewCard club={baseClub} podCount={0} />);
    expect(screen.getByText('No description added yet.')).toBeInTheDocument();
  });

  it('shows the real description when present', () => {
    render(<ClubOverviewCard club={{ ...baseClub, club_description: 'Sunday hikes.' }} podCount={0} />);
    expect(screen.getByText('Sunday hikes.')).toBeInTheDocument();
    expect(screen.queryByText('No description added yet.')).not.toBeInTheDocument();
  });

  it('shows "No ratings" when ratings_count is 0', () => {
    render(<ClubOverviewCard club={{ ...baseClub, ratings_count: 0, rating: 0 }} podCount={0} />);
    expect(screen.getByText('No ratings')).toBeInTheDocument();
  });

  it('shows the rounded rating with its count when ratings exist', () => {
    render(<ClubOverviewCard club={{ ...baseClub, ratings_count: 24, rating: 4.567 }} podCount={0} />);
    expect(screen.getByText('4.6 (24)')).toBeInTheDocument();
  });

  it('renders the followers, venues, pods and rating stats', () => {
    render(<ClubOverviewCard club={{ ...baseClub, followers_count: 120, matched_venues_count: 5 }} podCount={9} />);
    expect(screen.getByText('120')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('9')).toBeInTheDocument();
  });

  it('hides the locality row when there is no locality', () => {
    render(<ClubOverviewCard club={baseClub} podCount={0} />);
    expect(screen.queryByText('Indiranagar')).not.toBeInTheDocument();
  });

  it('shows the locality when present', () => {
    render(<ClubOverviewCard club={{ ...baseClub, locality: 'Indiranagar' }} podCount={0} />);
    expect(screen.getByText('Indiranagar')).toBeInTheDocument();
  });

  it('hides both WhatsApp buttons when neither link is set', () => {
    render(<ClubOverviewCard club={baseClub} podCount={0} />);
    expect(screen.queryByText('Community')).not.toBeInTheDocument();
    expect(screen.queryByText('Group chat')).not.toBeInTheDocument();
  });

  it('shows the community link button with the right href, independent of the group link', () => {
    render(
      <ClubOverviewCard
        club={{ ...baseClub, club_whats_app_community_link: 'https://chat.whatsapp.com/community' }}
        podCount={0}
      />,
    );
    const link = screen.getByRole('link', { name: /community/i });
    expect(link).toHaveAttribute('href', 'https://chat.whatsapp.com/community');
    expect(screen.queryByText('Group chat')).not.toBeInTheDocument();
  });

  it('shows the group link button with the right href, independent of the community link', () => {
    render(
      <ClubOverviewCard club={{ ...baseClub, club_whats_app_group_link: 'https://chat.whatsapp.com/group' }} podCount={0} />,
    );
    const link = screen.getByRole('link', { name: 'Group chat' });
    expect(link).toHaveAttribute('href', 'https://chat.whatsapp.com/group');
  });

  it('shows both WhatsApp buttons together when both links are set', () => {
    render(
      <ClubOverviewCard
        club={{
          ...baseClub,
          club_whats_app_community_link: 'https://chat.whatsapp.com/community',
          club_whats_app_group_link: 'https://chat.whatsapp.com/group',
        }}
        podCount={0}
      />,
    );
    expect(screen.getByRole('link', { name: /community/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Group chat' })).toBeInTheDocument();
  });
});
