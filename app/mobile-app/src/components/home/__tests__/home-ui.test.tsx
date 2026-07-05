import { fireEvent, screen } from '@testing-library/react-native';
import { Text } from 'tamagui';

import { HappeningNearbyHeader } from '@/components/home/HappeningNearbyHeader';
import { HomeFilterButton } from '@/components/home/HomeFilterButton';
import { HomeVibeChips } from '@/components/home/HomeVibeChips';
import { PodCard } from '@/components/home/PodCard';
import { PreviousPodsRail } from '@/components/home/PreviousPodsRail';
import type { HomePod, VibeCategory } from '@/hooks/useHomeFeed';
import { renderWithProviders } from '@/utils/test-utils';

const categories: VibeCategory[] = [
  { id: 'c1', name: 'Music', icon: '🎵', subs: [{ id: 's1', name: 'Jazz' }] },
  { id: 'c2', name: 'Sports', icon: 'https://cdn.duncit/sport.png', subs: [] },
];

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

  it('renders nothing when there are no categories', () => {
    renderWithProviders(<HomeVibeChips categories={[]} selectedId="" onSelect={jest.fn()} />);
    expect(screen.queryByTestId('vibe-chip-all')).toBeNull();
  });

  it('hides the sub row for a selected category with no subcategories', () => {
    renderWithProviders(
      <HomeVibeChips categories={categories} selectedId="c2" onSelect={jest.fn()} />,
    );
    expect(screen.queryByTestId('vibe-sub-all-c2')).toBeNull();
  });

  it('shows the selected category subcategory row and selects a sub', () => {
    const onSelect = jest.fn();
    renderWithProviders(
      <HomeVibeChips categories={categories} selectedId="c1" onSelect={onSelect} />,
    );
    // Second row appears for the active category (c1 has subs).
    expect(screen.getByTestId('vibe-sub-all-c1')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('vibe-sub-s1'));
    expect(onSelect).toHaveBeenCalledWith('s1');
  });

  it('keeps the sub row open when a sub is selected and returns to the category', () => {
    const onSelect = jest.fn();
    renderWithProviders(
      <HomeVibeChips categories={categories} selectedId="s1" onSelect={onSelect} />,
    );
    // The parent category chip is highlighted via its sub selection.
    fireEvent.press(screen.getByTestId('vibe-sub-s1'));
    expect(onSelect).toHaveBeenCalledWith('c1');
    // "All <category>" returns to the broad category filter.
    fireEvent.press(screen.getByTestId('vibe-sub-all-c1'));
    expect(onSelect).toHaveBeenCalledWith('c1');
    // Pressing the parent category chip while a sub is active selects the category.
    fireEvent.press(screen.getByTestId('vibe-chip-c1'));
    expect(onSelect).toHaveBeenCalledWith('c1');
  });

  it('renders a header action even with no categories', () => {
    renderWithProviders(
      <HomeVibeChips
        categories={[]}
        selectedId=""
        onSelect={jest.fn()}
        action={<Text>ACT</Text>}
      />,
    );
    expect(screen.getByText('ACT')).toBeOnTheScreen();
    expect(screen.queryByTestId('vibe-chip-all')).toBeNull();
  });

  it('renders each tab icon: emoji, image thumbnail and the All fallback', () => {
    renderWithProviders(
      <HomeVibeChips categories={categories} selectedId="" onSelect={jest.fn()} />,
    );
    // Emoji icon → text; http icon → image thumbnail.
    expect(screen.getByTestId('vibe-chip-c1-emoji')).toBeOnTheScreen();
    expect(screen.getByTestId('vibe-chip-c2-image')).toBeOnTheScreen();
    // The "All" tab has no icon → MaterialIcons fallback (no emoji/image nodes).
    expect(screen.queryByTestId('vibe-chip-all-emoji')).toBeNull();
    expect(screen.queryByTestId('vibe-chip-all-image')).toBeNull();
  });

  it('renders the admin-managed All-tab icon as an image when provided', () => {
    renderWithProviders(
      <HomeVibeChips
        categories={categories}
        selectedId=""
        onSelect={jest.fn()}
        allIcon="https://cdn.duncit/all.png"
      />,
    );
    expect(screen.getByTestId('vibe-chip-all-image')).toBeOnTheScreen();
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
  it('shows the live pod count below the title', () => {
    renderWithProviders(<HappeningNearbyHeader totalPods={7} />);
    expect(screen.getByText('7 pods nearby')).toBeOnTheScreen();
    expect(screen.getByText('See all')).toBeOnTheScreen();
  });

  it('uses the singular label for a single pod', () => {
    renderWithProviders(<HappeningNearbyHeader totalPods={1} />);
    expect(screen.getByText('1 pod nearby')).toBeOnTheScreen();
  });

  it('opens the nearby page from the title row and the See all chip', () => {
    const onPress = jest.fn();
    renderWithProviders(<HappeningNearbyHeader totalPods={7} onPress={onPress} />);
    fireEvent.press(screen.getByText('Happening nearby'));
    fireEvent.press(screen.getByTestId('happening-nearby-see-all'));
    expect(onPress).toHaveBeenCalledTimes(2);
  });
});

describe('HomeFilterButton', () => {
  it('fires onPress and shows the active-filter badge', () => {
    const onPress = jest.fn();
    renderWithProviders(<HomeFilterButton count={2} onPress={onPress} />);
    expect(screen.getByTestId('home-filter-badge')).toBeOnTheScreen();
    expect(screen.getByText('2')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('home-filter-button'));
    expect(onPress).toHaveBeenCalled();
  });

  it('omits the badge when no filters are active (count defaults to 0)', () => {
    renderWithProviders(<HomeFilterButton onPress={jest.fn()} />);
    expect(screen.queryByTestId('home-filter-badge')).toBeNull();
  });

  it('does not fire onPress or show a badge when disabled', () => {
    const onPress = jest.fn();
    renderWithProviders(<HomeFilterButton count={3} disabled onPress={onPress} />);
    expect(screen.queryByTestId('home-filter-badge')).toBeNull();
    fireEvent.press(screen.getByTestId('home-filter-button'));
    expect(onPress).not.toHaveBeenCalled();
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
