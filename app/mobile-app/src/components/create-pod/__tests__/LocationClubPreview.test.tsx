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

// The header LocationDialog has its own spec (with GPS/map). Stub it to a button
// that applies a configurable (location, zone) pick so we can test the wiring.
let mockLocationApply: [{ id: string }, string] = [{ id: 'l2' }, 'HSR Zone'];
jest.mock('@/components/LocationDialog', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Pressable, Text } = require('react-native');
  return {
    LocationDialog: ({
      open,
      onApply,
      onClose,
    }: {
      open: boolean;
      onApply: (loc: { id: string }, zone: string) => void;
      onClose: () => void;
    }) =>
      open ? (
        <Pressable
          testID="mock-location-apply"
          onPress={() => {
            onApply(mockLocationApply[0], mockLocationApply[1]);
            onClose();
          }}
        >
          <Text>apply</Text>
        </Pressable>
      ) : null,
  };
});

const locations = [
  { id: 'l1', location_name: 'Pune', city: 'Pune', state: 'MH' },
  { id: 'l2', location_name: 'HSR', city: 'Bengaluru', state: 'KA' },
  { id: 'l3', location_name: 'Goa', city: null },
];
const clubs = [{ id: 'c1', club_name: 'Runners', location_id: 'l1', super_category_id: null }];
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
  it('shows the default pod location and the selectable host category', () => {
    renderWithProviders(<Harness initial={{ location_id: 'l1' }} />);
    expect(screen.getByTestId('create-pod-location-label')).toHaveTextContent('Pune, MH');
    expect(screen.getByText('Sports › Running › Trail')).toBeOnTheScreen();
    // The header picker is closed until "Change" is pressed.
    expect(screen.queryByTestId('mock-location-apply')).toBeNull();
  });

  it('falls back when no location is picked and no category is onboarded', () => {
    renderWithProviders(<Harness categories={[]} />);
    expect(screen.getByTestId('create-pod-location-label')).toHaveTextContent(
      'No location selected',
    );
    expect(screen.getByTestId('create-pod-category-empty')).toHaveTextContent(
      'Assigned after host onboarding',
    );
  });

  it('changes the city + locality through the header picker and clears venue + slot', () => {
    mockLocationApply = [{ id: 'l2' }, 'Baner'];
    renderWithProviders(
      <Harness initial={{ location_id: 'l1', venue_id: 'v1', venue_slot_id: 's1' }} />,
    );
    fireEvent.press(screen.getByTestId('create-pod-change-location'));
    fireEvent.press(screen.getByTestId('mock-location-apply'));
    expect(screen.getByTestId('create-pod-location-label')).toHaveTextContent(/HSR \(Bengaluru\)/);
    expect(screen.getByTestId('create-pod-locality-label')).toHaveTextContent('Locality: Baner');
  });

  it('applies a locality without changing the city', () => {
    mockLocationApply = [{ id: 'l1' }, 'Camp'];
    renderWithProviders(<Harness initial={{ location_id: 'l1' }} />);
    fireEvent.press(screen.getByTestId('create-pod-change-location'));
    fireEvent.press(screen.getByTestId('mock-location-apply'));
    expect(screen.getByTestId('create-pod-location-label')).toHaveTextContent('Pune, MH');
    expect(screen.getByTestId('create-pod-locality-label')).toHaveTextContent('Locality: Camp');
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
