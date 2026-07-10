import { fireEvent, screen } from '@testing-library/react-native';

import { FaqsScreen } from '@/screens/FaqsScreen';
import { PoliciesScreen } from '@/screens/PoliciesScreen';
import { SavedScreen } from '@/screens/SavedScreen';
import { useFaqs } from '@/hooks/useLibrary';
import { useSavedPods } from '@/hooks/useSavedPods';
import { usePodHistoryCategories } from '@/hooks/usePodHistory';
import { usePublicPolicies } from '@/hooks/usePolicies';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/hooks/useLibrary', () => ({ useFaqs: jest.fn() }));
jest.mock('@/hooks/useSavedPods', () => ({ useSavedPods: jest.fn() }));
jest.mock('@/hooks/usePodHistory', () => ({ usePodHistoryCategories: jest.fn(() => []) }));
jest.mock('@/hooks/usePolicies', () => ({ usePublicPolicies: jest.fn() }));
const mockOpenPod = jest.fn();
jest.mock('@/hooks/useDetailNav', () => ({
  useDetailNav: () => ({ openPod: mockOpenPod, openClub: jest.fn() }),
}));
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ canGoBack: () => true, navigate: mockNavigate, goBack: jest.fn() }),
}));

const mockedFaqs = useFaqs as jest.Mock;
const mockedSaved = useSavedPods as jest.Mock;
const mockedCategories = usePodHistoryCategories as jest.Mock;
const mockedPolicies = usePublicPolicies as jest.Mock;

const pod = (id: string) =>
  ({
    id,
    pod_id: `p-${id}`,
    pod_title: `Pod ${id}`,
    pod_date_time: '2026-06-12T00:00:00Z',
    pod_type: 'NATIVE_FREE',
    pod_amount: 0,
    no_of_spots: 4,
    host_names: [],
    pod_images_and_videos: [],
    club_id: 'c1',
    club_slug: 's',
    place_label: null,
    place_detail: null,
  }) as never;

beforeEach(() => {
  mockNavigate.mockClear();
  mockOpenPod.mockClear();
});

describe('FaqsScreen', () => {
  it('renders FAQ accordions, empty and loading states', () => {
    mockedFaqs.mockReturnValue({
      groups: [
        {
          super_category: { id: 's', name: 'General' },
          faqs: [{ id: 'f1', question: 'How?', answer: 'Like this' }],
        },
        { super_category: null, faqs: [{ id: 'f2', question: 'Why?', answer: 'Because' }] },
      ],
      isLoading: false,
    });
    const { rerender } = renderWithProviders(<FaqsScreen />);
    expect(screen.getByText('How?')).toBeOnTheScreen();
    expect(screen.getByText('Why?')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('faq-f1-header')); // open
    fireEvent.press(screen.getByTestId('faq-f1-header')); // close (id === faq.id → null)

    mockedFaqs.mockReturnValue({ groups: [], isLoading: false });
    rerender(<FaqsScreen />);
    expect(screen.getByTestId('faqs-empty')).toBeOnTheScreen();

    mockedFaqs.mockReturnValue({ groups: [], isLoading: true });
    rerender(<FaqsScreen />);
    expect(screen.getByTestId('faqs-loading')).toBeOnTheScreen();
  });

  it('filters questions by search text and shows the no-match state', () => {
    mockedFaqs.mockReturnValue({
      groups: [
        {
          super_category: { id: 's', name: 'General' },
          faqs: [
            { id: 'f1', question: 'How do refunds work?', answer: 'They are processed fast' },
            { id: 'f2', question: 'Can I host?', answer: 'Yes, become a host' },
          ],
        },
      ],
      isLoading: false,
    });
    renderWithProviders(<FaqsScreen />);

    fireEvent.changeText(screen.getByTestId('faqs-search'), 'refund');
    expect(screen.getByText('How do refunds work?')).toBeOnTheScreen();
    expect(screen.queryByText('Can I host?')).toBeNull();

    fireEvent.changeText(screen.getByTestId('faqs-search'), 'nothing matches this');
    expect(screen.getByTestId('faqs-no-match')).toBeOnTheScreen();
  });
});

const savedCategories = [
  { id: 's1', name: 'For You', level: 'SUPER', parent_id: null },
  { id: 'c1', name: 'Sports', level: 'CATEGORY', parent_id: 's1' },
  { id: 'sub1', name: 'Cricket', level: 'SUB', parent_id: 'c1' },
] as never;

describe('SavedScreen', () => {
  beforeEach(() => {
    mockedCategories.mockReset().mockReturnValue(savedCategories);
    mockedSaved
      .mockReset()
      .mockReturnValue({ pods: [pod('1')], isLoading: false, error: undefined });
  });

  it('opens a saved pod and shows the empty + loading states', () => {
    const { rerender } = renderWithProviders(<SavedScreen />);
    fireEvent.press(screen.getByTestId('pod-card-p-1'));
    expect(mockOpenPod).toHaveBeenCalled();

    mockedSaved.mockReturnValue({ pods: [], isLoading: false, error: undefined });
    rerender(<SavedScreen />);
    expect(screen.getByTestId('saved-list-empty')).toBeOnTheScreen();

    mockedSaved.mockReturnValue({ pods: [], isLoading: true, error: undefined });
    rerender(<SavedScreen />);
    expect(screen.getByTestId('saved-list-loading')).toBeOnTheScreen();
  });

  it('surfaces a fetch error', () => {
    mockedSaved.mockReturnValue({ pods: [], isLoading: false, error: new Error('boom') });
    renderWithProviders(<SavedScreen />);
    expect(screen.getByTestId('saved-error')).toHaveTextContent('boom');
  });

  it('feeds the typed search query into the query', () => {
    renderWithProviders(<SavedScreen />);
    fireEvent.changeText(screen.getByTestId('saved-search'), 'yoga');
    expect(mockedSaved).toHaveBeenLastCalledWith(expect.objectContaining({ search: 'yoga' }));
  });

  it('cascades the Super → Category → Sub filter, sends the deepest node, then resets', () => {
    renderWithProviders(<SavedScreen />);
    fireEvent.press(screen.getByTestId('saved-filter-button'));
    // Category is gated until a Super is chosen; Sub until a Category is.
    expect(screen.getByTestId('saved-cat-hint')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('saved-super-s1'));
    expect(screen.getByTestId('saved-sub-hint')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('saved-cat-c1'));
    fireEvent.press(screen.getByTestId('saved-sub-sub1'));
    // The deepest selected node (the sub) is what the server receives.
    expect(mockedSaved).toHaveBeenLastCalledWith(expect.objectContaining({ categoryId: 'sub1' }));
    fireEvent.press(screen.getByTestId('saved-filter-reset'));
    expect(mockedSaved).toHaveBeenLastCalledWith(expect.objectContaining({ categoryId: null }));
    fireEvent.press(screen.getByTestId('saved-filter-done'));
  });

  it('sorts via the sort sheet and closes both sheets from their close buttons', () => {
    renderWithProviders(<SavedScreen />);
    fireEvent.press(screen.getByTestId('saved-sort-button'));
    fireEvent.press(screen.getByTestId('saved-sort-PRICE_LOW'));
    expect(mockedSaved).toHaveBeenLastCalledWith(expect.objectContaining({ sort: 'PRICE_LOW' }));
    fireEvent.press(screen.getByTestId('saved-filter-button'));
    fireEvent.press(screen.getByTestId('saved-filter-close'));
    fireEvent.press(screen.getByTestId('saved-sort-button'));
    fireEvent.press(screen.getByTestId('saved-sort-close'));
    expect(screen.getByTestId('pod-card-p-1')).toBeOnTheScreen();
  });
});

describe('PoliciesScreen', () => {
  it('opens a policy, and shows loading + empty states', () => {
    mockedPolicies.mockReturnValue({
      data: { publicPolicies: [{ id: 'pol1', slug: 'terms', title: 'Terms' }] },
      isLoading: false,
    });
    const { rerender } = renderWithProviders(<PoliciesScreen />);
    fireEvent.press(screen.getByTestId('policy-terms'));
    expect(mockNavigate).toHaveBeenCalledWith('Policy', { slug: 'terms' });

    mockedPolicies.mockReturnValue({ data: { publicPolicies: [] }, isLoading: false });
    rerender(<PoliciesScreen />);
    expect(screen.getByTestId('policies-empty')).toBeOnTheScreen();

    mockedPolicies.mockReturnValue({ data: undefined, isLoading: true });
    rerender(<PoliciesScreen />);
    expect(screen.getByTestId('policies-loading')).toBeOnTheScreen();
  });
});
