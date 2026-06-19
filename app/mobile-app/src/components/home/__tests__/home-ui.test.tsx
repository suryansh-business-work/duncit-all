import { fireEvent, screen } from '@testing-library/react-native';

import { HappeningNearbyHeader } from '@/components/home/HappeningNearbyHeader';
import { HomeVibeChips } from '@/components/home/HomeVibeChips';
import { PodCard } from '@/components/home/PodCard';
import { PreviousPodsRail } from '@/components/home/PreviousPodsRail';
import type { HomeCategory, HomePod } from '@/hooks/useHomeFeed';
import { renderWithProviders } from '@/utils/test-utils';

const categories = [
  { id: 'c1', name: 'Music', slug: 'music', level: 'CATEGORY', parent_id: null },
] as unknown as HomeCategory[];

const pod = {
  id: 'pod1',
  pod_id: 'p1',
  pod_title: 'Sunset Jam',
  club_id: 'club1',
  club_slug: 'jam',
  no_of_spots: 8,
  pod_amount: 0,
  pod_type: 'NATIVE_FREE',
  pod_date_time: '2026-06-07T18:30:00.000Z',
  pod_images_and_videos: [],
  host_names: [],
  place_label: 'Cafe',
  place_detail: 'MG Road',
} as unknown as HomePod;

describe('HomeVibeChips', () => {
  it('selects a chip on press', () => {
    const onSelect = jest.fn();
    renderWithProviders(
      <HomeVibeChips categories={categories} selectedId="" onSelect={onSelect} />,
    );
    fireEvent.press(screen.getByTestId('vibe-chip-c1'));
    expect(onSelect).toHaveBeenCalledWith('c1');
  });

  it('deselects when the active chip is pressed again', () => {
    const onSelect = jest.fn();
    renderWithProviders(
      <HomeVibeChips categories={categories} selectedId="c1" onSelect={onSelect} />,
    );
    fireEvent.press(screen.getByTestId('vibe-chip-c1'));
    expect(onSelect).toHaveBeenCalledWith('');
  });

  it('clears the category filter via the All chip', () => {
    const onSelect = jest.fn();
    renderWithProviders(
      <HomeVibeChips categories={categories} selectedId="c1" onSelect={onSelect} />,
    );
    fireEvent.press(screen.getByTestId('vibe-chip-all'));
    expect(onSelect).toHaveBeenCalledWith('');
  });
});

describe('PodCard', () => {
  it('renders the title, place and a free price', () => {
    renderWithProviders(<PodCard pod={pod} />);
    expect(screen.getByTestId('pod-card-p1')).toBeOnTheScreen();
    expect(screen.getByText('Sunset Jam')).toBeOnTheScreen();
    expect(screen.getByText('Cafe · MG Road')).toBeOnTheScreen();
    expect(screen.getByText('· Free')).toBeOnTheScreen();
  });
});

describe('HappeningNearbyHeader', () => {
  it('shows the live pod count in the See all chip', () => {
    renderWithProviders(<HappeningNearbyHeader totalPods={7} />);
    expect(screen.getByText('See all · 7 pods')).toBeOnTheScreen();
  });

  it('opens the nearby page from the title row and the See all chip', () => {
    const onPress = jest.fn();
    renderWithProviders(<HappeningNearbyHeader totalPods={7} onPress={onPress} />);
    fireEvent.press(screen.getByText('Happening nearby'));
    fireEvent.press(screen.getByTestId('happening-nearby-see-all'));
    expect(onPress).toHaveBeenCalledTimes(2);
  });

  it('hides the filter button when no handler is given', () => {
    renderWithProviders(<HappeningNearbyHeader totalPods={1} />);
    expect(screen.queryByTestId('happening-nearby-filter')).toBeNull();
  });

  it('opens the filter sheet and shows the active-filter badge', () => {
    const onOpenFilter = jest.fn();
    renderWithProviders(
      <HappeningNearbyHeader totalPods={1} onOpenFilter={onOpenFilter} filterCount={2} />,
    );
    expect(screen.getByTestId('happening-nearby-filter-badge')).toBeOnTheScreen();
    expect(screen.getByText('2')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('happening-nearby-filter'));
    expect(onOpenFilter).toHaveBeenCalled();
  });

  it('omits the badge when no filters are active', () => {
    renderWithProviders(
      <HappeningNearbyHeader totalPods={1} onOpenFilter={jest.fn()} filterCount={0} />,
    );
    expect(screen.queryByTestId('happening-nearby-filter-badge')).toBeNull();
  });
});

describe('PreviousPodsRail', () => {
  it('renders nothing when there are no previous pods', () => {
    renderWithProviders(<PreviousPodsRail pods={[]} onSeeAll={jest.fn()} onOpenPod={jest.fn()} />);
    expect(screen.queryByTestId('previous-pods-see-all')).toBeNull();
  });

  it('lists previous pods and fires see-all + pod-open', () => {
    const onSeeAll = jest.fn();
    const onOpenPod = jest.fn();
    renderWithProviders(
      <PreviousPodsRail pods={[pod]} onSeeAll={onSeeAll} onOpenPod={onOpenPod} />,
    );
    expect(screen.getByText('Previous Pods')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('previous-pods-see-all'));
    expect(onSeeAll).toHaveBeenCalled();
    fireEvent.press(screen.getByTestId('pod-card-p1'));
    expect(onOpenPod).toHaveBeenCalled();
  });
});
