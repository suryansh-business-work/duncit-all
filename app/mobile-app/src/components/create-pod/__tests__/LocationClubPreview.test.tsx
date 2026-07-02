import { fireEvent, screen } from '@testing-library/react-native';
import { useForm } from 'react-hook-form';

import { ClubPreview } from '@/components/create-pod/ClubPreview';
import { LocationClubStep } from '@/components/create-pod/steps/LocationClubStep';
import {
  blankCreatePodForm,
  type CreatePodFormValues,
  type CreatePodHostCategory,
} from '@/components/create-pod';
import { renderWithProviders } from '@/utils/test-utils';

const locations = [
  { id: 'l1', location_name: 'Pune', city: 'Pune', state: 'MH' },
  { id: 'l2', location_name: 'HSR', city: 'Bengaluru', state: 'KA' },
  { id: 'l3', location_name: 'Goa', city: null },
];
const clubs = [{ id: 'c1', club_name: 'Runners', meetup_venues_id: [] }];
const hostCategories: CreatePodHostCategory[] = [
  { super_category_name: 'Sports', category_name: 'Running', sub_category_name: 'Trail' },
];

function Harness({
  initial = {},
  categories = hostCategories,
}: Readonly<{
  initial?: Partial<CreatePodFormValues>;
  categories?: CreatePodHostCategory[];
}>) {
  const form = useForm<CreatePodFormValues>({
    defaultValues: { ...blankCreatePodForm, ...initial },
  });
  return (
    <LocationClubStep form={form} clubs={clubs} locations={locations} hostCategories={categories} />
  );
}

describe('LocationClubStep', () => {
  it('shows the default pod location and the read-only host category', () => {
    renderWithProviders(<Harness initial={{ location_id: 'l1' }} />);
    expect(screen.getByTestId('create-pod-location-label')).toHaveTextContent('Pune, MH');
    expect(screen.getByTestId('create-pod-category')).toHaveTextContent('Sports › Running › Trail');
    expect(screen.queryByTestId('create-pod-location-search')).toBeNull();
  });

  it('falls back when no location is picked and no category is onboarded', () => {
    renderWithProviders(<Harness categories={[]} />);
    expect(screen.getByTestId('create-pod-location-label')).toHaveTextContent(
      'No location selected',
    );
    expect(screen.getByTestId('create-pod-category')).toHaveTextContent(
      'Assigned after host onboarding',
    );
  });

  it('changes the pod location through the inline picker and clears venue + slot', () => {
    renderWithProviders(
      <Harness initial={{ location_id: 'l1', venue_id: 'v1', venue_slot_id: 's1' }} />,
    );
    fireEvent.press(screen.getByTestId('create-pod-change-location'));
    // Labels use the "(city)" suffix only when it differs from the name.
    expect(screen.getByText('Pune')).toBeOnTheScreen();
    expect(screen.getByText('HSR (Bengaluru)')).toBeOnTheScreen();
    expect(screen.getByText('Goa')).toBeOnTheScreen();
    // Search narrows the list.
    fireEvent.changeText(screen.getByTestId('create-pod-location-search'), 'bengaluru');
    expect(screen.queryByTestId('create-pod-location-l1')).toBeNull();
    fireEvent.press(screen.getByTestId('create-pod-location-l2'));
    // Picker closes and the card reflects the new city.
    expect(screen.queryByTestId('create-pod-location-search')).toBeNull();
    expect(screen.getByTestId('create-pod-location-label')).toHaveTextContent(/HSR \(Bengaluru\)/);
  });

  it('re-picking the same location just closes the picker', () => {
    renderWithProviders(<Harness initial={{ location_id: 'l1' }} />);
    fireEvent.press(screen.getByTestId('create-pod-change-location'));
    fireEvent.press(screen.getByTestId('create-pod-location-l1'));
    expect(screen.queryByTestId('create-pod-location-search')).toBeNull();
    expect(screen.getByTestId('create-pod-location-label')).toHaveTextContent('Pune, MH');
    // The Change button also closes an open picker.
    fireEvent.press(screen.getByTestId('create-pod-change-location'));
    fireEvent.press(screen.getByTestId('create-pod-change-location'));
    expect(screen.queryByTestId('create-pod-location-search')).toBeNull();
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
