import { fireEvent, screen } from '@testing-library/react-native';
import { useForm } from 'react-hook-form';

import { ClubPreview } from '@/components/create-pod/ClubPreview';
import { LocationStep } from '@/components/create-pod/steps/LocationStep';
import { blankCreatePodForm, type CreatePodFormValues } from '@/components/create-pod';
import { renderWithProviders } from '@/utils/test-utils';

const locations = [
  { id: 'l1', location_name: 'Pune', city: 'Pune' },
  { id: 'l2', location_name: 'HSR', city: 'Bengaluru' },
  { id: 'l3', location_name: 'Goa', city: null },
];

function LocationHarness() {
  const form = useForm<CreatePodFormValues>({ defaultValues: blankCreatePodForm });
  return <LocationStep form={form} locations={locations} />;
}

describe('LocationStep', () => {
  it('lists cities (with the "(city)" suffix only when it differs) and picks one', () => {
    renderWithProviders(<LocationHarness />);
    expect(screen.getByText('Pune')).toBeOnTheScreen();
    expect(screen.getByText('HSR (Bengaluru)')).toBeOnTheScreen();
    expect(screen.getByText('Goa')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('create-pod-location-l1'));
  });

  it('filters the list from the search box', () => {
    renderWithProviders(<LocationHarness />);
    fireEvent.changeText(screen.getByTestId('create-pod-location-search'), 'bengaluru');
    expect(screen.getByTestId('create-pod-location-l2')).toBeOnTheScreen();
    expect(screen.queryByTestId('create-pod-location-l1')).toBeNull();
  });
});

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
});
