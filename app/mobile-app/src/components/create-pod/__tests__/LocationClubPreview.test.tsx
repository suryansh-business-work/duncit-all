import { fireEvent, screen } from '@testing-library/react-native';

import { ClubPreview } from '@/components/create-pod/ClubPreview';
import { renderWithProviders } from '@/utils/test-utils';

const fullClub = {
  id: 'c1',
  club_name: 'Runners',
  club_description: 'We run every Sunday.',
  club_feature_images_and_videos: [
    { url: 'https://cdn/club.jpg', type: 'IMAGE' },
    { url: 'https://cdn/club2.jpg', type: null },
    { url: 'https://cdn/clip.mp4', type: 'VIDEO' },
  ],
};

describe('ClubPreview', () => {
  it('renders nothing without a club', () => {
    renderWithProviders(<ClubPreview club={null} />);
    expect(screen.queryByTestId('club-preview')).toBeNull();
  });

  it('shows the cover photo and opens/closes the details dialog', () => {
    renderWithProviders(<ClubPreview club={fullClub} />);
    expect(screen.getByText('Runners')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('club-preview-details'));
    expect(screen.getByTestId('club-preview-dialog')).toBeOnTheScreen();
    expect(screen.getByText('We run every Sunday.')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('club-preview-close'));
    expect(screen.queryByTestId('club-preview-dialog')).toBeNull();
  });

  it('falls back to the icon + placeholder copy without media or description', () => {
    renderWithProviders(
      <ClubPreview club={{ id: 'c2', club_name: 'Writers', club_description: '  ' }} />,
    );
    fireEvent.press(screen.getByTestId('club-preview-details'));
    expect(screen.getByText('No description yet.')).toBeOnTheScreen();
  });

  it('shows the matched-venue count (0 when unset, singular vs plural)', () => {
    // No count → falls back to 0 venues.
    const { rerender } = renderWithProviders(<ClubPreview club={{ id: 'c3', club_name: 'A' }} />);
    expect(screen.getByTestId('club-preview-venue-count')).toHaveTextContent('0 venues');
    // Exactly one → singular.
    rerender(<ClubPreview club={{ id: 'c3', club_name: 'A', matched_venues_count: 1 }} />);
    expect(screen.getByTestId('club-preview-venue-count')).toHaveTextContent('1 venue');
    // Many → plural with the real count.
    rerender(<ClubPreview club={{ id: 'c3', club_name: 'A', matched_venues_count: 4 }} />);
    expect(screen.getByTestId('club-preview-venue-count')).toHaveTextContent('4 venues');
  });
});
