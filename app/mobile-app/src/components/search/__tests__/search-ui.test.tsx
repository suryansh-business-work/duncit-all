import { fireEvent, screen } from '@testing-library/react-native';

import { SearchClubCard } from '@/components/search/SearchClubCard';
import { SearchResultsSection } from '@/components/search/SearchResultsSection';
import { CategoryActions } from '@/components/search/CategoryActions';
import { SearchEmptyState } from '@/components/search/SearchEmptyState';
import { SearchSuggestions } from '@/components/search/SearchSuggestions';
import { CategoryLevel } from '@/generated/graphql/graphql';
import { useClubFollow } from '@/hooks/useFollow';
import type { SearchCategory, SearchClubResult, SearchSuggestion } from '@/hooks/useSearch';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/hooks/useFollow', () => ({ useClubFollow: jest.fn() }));
const mockUseClubFollow = useClubFollow as jest.Mock;
const toggle = jest.fn();

const pod = (id = 'p1') => ({
  id,
  pod_id: `pod-${id}`,
  pod_title: 'Sunset Yoga',
  pod_date_time: '2030-01-01T00:00:00.000Z',
  pod_type: 'FREE',
  pod_amount: 0,
  no_of_spots: 4,
  host_names: [],
  pod_images_and_videos: [],
  club_id: 'c1',
  club_slug: 's',
  location_id: null,
  pod_mode: null,
  place_label: null,
  place_detail: null,
  pod_attendees: [],
});

const baseClub = {
  id: 'c1',
  club_id: 'club-1',
  club_name: 'Badminton Club',
  club_description: 'Smash it weekly',
  followers_count: 12,
  category_id: null,
  super_category_id: null,
  club_feature_images_and_videos: [] as { url: string; type: string }[],
};

const result = (over: Record<string, unknown> = {}, clubOver: Record<string, unknown> = {}) =>
  ({
    is_following: false,
    participant_count: 0,
    next_pod_date: null,
    upcoming_pods: [],
    ...over,
    club: { ...baseClub, ...clubOver },
  }) as unknown as SearchClubResult;

beforeEach(() => {
  mockUseClubFollow.mockReturnValue({ following: false, busy: false, toggle });
  toggle.mockClear();
});

describe('SearchClubCard', () => {
  it('renders an upcoming-pod card with a Follow CTA, category, image and opens club/pod', () => {
    const onOpenClub = jest.fn();
    const onOpenPod = jest.fn();
    renderWithProviders(
      <SearchClubCard
        result={result(
          { upcoming_pods: [pod('p1')] },
          { club_feature_images_and_videos: [{ url: 'https://img', type: 'IMAGE' }] },
        )}
        categoryName="Sports"
        onOpenClub={onOpenClub}
        onOpenPod={onOpenPod}
      />,
    );
    expect(screen.getByText('Sports')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('search-follow-club-1'));
    expect(toggle).toHaveBeenCalled();
    fireEvent.press(screen.getByLabelText('Badminton Club'));
    expect(onOpenClub).toHaveBeenCalledWith('club-1');
    fireEvent.press(screen.getByTestId('pod-card-pod-p1'));
    expect(onOpenPod).toHaveBeenCalled();
  });

  it('shows a Following chip, description and no category when already followed', () => {
    mockUseClubFollow.mockReturnValue({ following: true, busy: false, toggle });
    renderWithProviders(
      <SearchClubCard
        result={result({ is_following: true })}
        categoryName={null}
        onOpenClub={jest.fn()}
        onOpenPod={jest.fn()}
      />,
    );
    expect(screen.getByTestId('search-following-club-1')).toBeOnTheScreen();
    expect(screen.getByText('Smash it weekly')).toBeOnTheScreen();
    expect(screen.queryByText('Sports')).toBeNull();
  });

  it('renders no body when there are neither pods nor a description', () => {
    renderWithProviders(
      <SearchClubCard
        result={result({}, { club_description: '' })}
        categoryName={null}
        onOpenClub={jest.fn()}
        onOpenPod={jest.fn()}
      />,
    );
    expect(screen.getByTestId('search-club-club-1')).toBeOnTheScreen();
    expect(screen.queryByText('Smash it weekly')).toBeNull();
  });

  it('dims the Follow CTA while a follow request is in flight', () => {
    mockUseClubFollow.mockReturnValue({ following: false, busy: true, toggle });
    renderWithProviders(
      <SearchClubCard
        result={result()}
        categoryName={null}
        onOpenClub={jest.fn()}
        onOpenPod={jest.fn()}
      />,
    );
    expect(screen.getByTestId('search-follow-club-1')).toBeOnTheScreen();
  });
});

describe('SearchResultsSection', () => {
  it('renders nothing for an empty group', () => {
    renderWithProviders(
      <SearchResultsSection
        heading="Happening"
        subheading="Sub"
        results={[]}
        categoryNameOf={() => null}
        onOpenClub={jest.fn()}
        onOpenPod={jest.fn()}
        testID="sec"
      />,
    );
    expect(screen.queryByTestId('sec')).toBeNull();
  });

  it('renders a heading and dotted-separated cards for each result', () => {
    renderWithProviders(
      <SearchResultsSection
        heading="Happening"
        subheading="Sub"
        results={[
          result({}, { id: 'c1', club_id: 'club-1' }),
          result({}, { id: 'c2', club_id: 'club-2' }),
        ]}
        categoryNameOf={() => null}
        onOpenClub={jest.fn()}
        onOpenPod={jest.fn()}
        testID="sec"
      />,
    );
    expect(screen.getByText('Happening')).toBeOnTheScreen();
    expect(screen.getByTestId('search-club-club-1')).toBeOnTheScreen();
    expect(screen.getByTestId('search-club-club-2')).toBeOnTheScreen();
  });
});

const category = (over: Partial<SearchCategory>) =>
  ({
    id: 'c1',
    name: 'Sports',
    slug: 'sports',
    icon: null,
    level: 'CATEGORY',
    parent_id: null,
    ...over,
  }) as unknown as SearchCategory;

describe('CategoryActions', () => {
  it('shows a placeholder when there are no categories', () => {
    renderWithProviders(<CategoryActions groups={[]} onSelect={jest.fn()} />);
    expect(screen.getByTestId('search-category-empty')).toBeOnTheScreen();
  });

  it('groups tiles under their super category with each icon kind, and selects one', () => {
    const onSelect = jest.fn();
    renderWithProviders(
      <CategoryActions
        groups={[
          {
            superCategory: category({
              id: 's1',
              name: 'Active',
              level: CategoryLevel.Super,
              icon: '⚡',
            }),
            categories: [
              category({ id: 'c1', name: 'Sports', icon: '🏸', parent_id: 's1' }),
              category({ id: 'c2', name: 'Creative', icon: 'PaletteIconName', parent_id: 's1' }),
            ],
          },
          {
            superCategory: category({
              id: 's2',
              name: 'Calm',
              level: CategoryLevel.Super,
              icon: null,
            }),
            categories: [
              category({ id: 'c3', name: 'Music', icon: null, parent_id: 's2' }),
              category({
                id: 'c4',
                name: 'Art',
                icon: 'https://ik.imagekit.io/duncit/art.png',
                parent_id: 's2',
              }),
            ],
          },
        ]}
        onSelect={onSelect}
      />,
    );
    expect(screen.getByText('Active')).toBeOnTheScreen();
    expect(screen.getByText('Calm')).toBeOnTheScreen();
    expect(screen.getByText('⚡')).toBeOnTheScreen();
    expect(screen.getByText('🏸')).toBeOnTheScreen();
    expect(screen.getByTestId('search-cat-group-s2')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('search-cat-c2'));
    expect(onSelect).toHaveBeenCalledWith('c2');
  });

  it('shows the admin image icon, and the glyph once that image fails', () => {
    renderWithProviders(
      <CategoryActions
        groups={[
          {
            superCategory: category({
              id: 's1',
              name: 'Calm',
              level: CategoryLevel.Super,
              icon: null,
            }),
            categories: [
              category({ id: 'c4', name: 'Art', icon: 'https://ik.imagekit.io/duncit/art.png' }),
            ],
          },
        ]}
        onSelect={jest.fn()}
      />,
    );
    fireEvent(screen.getByTestId('search-cat-c4-image'), 'error');
    expect(screen.queryByTestId('search-cat-c4-image')).toBeNull();
  });
});

describe('SearchEmptyState', () => {
  it('offers Share-a-Pod-Idea and Earn CTAs for a no-results search', () => {
    const onShareIdea = jest.fn();
    const onEarn = jest.fn();
    renderWithProviders(
      <SearchEmptyState
        variant="no-results"
        keyword="qwerty"
        onShareIdea={onShareIdea}
        onEarn={onEarn}
        onExploreCategories={jest.fn()}
      />,
    );
    expect(screen.getByText('No Pods Match Your Search')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('search-cta-idea'));
    expect(onShareIdea).toHaveBeenCalled();
    fireEvent.press(screen.getByTestId('search-cta-earn'));
    expect(onEarn).toHaveBeenCalled();
  });

  it('offers an Explore-More-Categories CTA for an empty category', () => {
    const onExploreCategories = jest.fn();
    renderWithProviders(
      <SearchEmptyState
        variant="empty-category"
        keyword=""
        onShareIdea={jest.fn()}
        onEarn={jest.fn()}
        onExploreCategories={onExploreCategories}
      />,
    );
    expect(screen.getByText('Nothing Here Yet')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('search-cta-explore'));
    expect(onExploreCategories).toHaveBeenCalled();
  });
});

describe('SearchSuggestions', () => {
  it('renders nothing when there are no suggestions', () => {
    renderWithProviders(<SearchSuggestions suggestions={[]} onPick={jest.fn()} />);
    expect(screen.queryByTestId('search-suggestions')).toBeNull();
  });

  it('lists suggestions with kind labels and picks one', () => {
    const onPick = jest.fn();
    const suggestions = [
      { text: 'Badminton', kind: 'CLUB' },
      { text: 'Smash', kind: 'WEIRD' },
    ] as unknown as SearchSuggestion[];
    renderWithProviders(<SearchSuggestions suggestions={suggestions} onPick={onPick} />);
    expect(screen.getByText('Club')).toBeOnTheScreen();
    expect(screen.getByText('WEIRD')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('search-suggestion-0'));
    expect(onPick).toHaveBeenCalledWith('Badminton');
  });
});
