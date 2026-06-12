import { fireEvent, screen } from '@testing-library/react-native';

import { FaqsScreen } from '@/screens/FaqsScreen';
import { PoliciesScreen } from '@/screens/PoliciesScreen';
import { SavedScreen } from '@/screens/SavedScreen';
import { useFaqs, useMyPods } from '@/hooks/useLibrary';
import { usePublicPolicies } from '@/hooks/usePolicies';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/hooks/useLibrary', () => ({ useFaqs: jest.fn(), useMyPods: jest.fn() }));
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
const mockedMyPods = useMyPods as jest.Mock;
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

describe('SavedScreen', () => {
  it('opens a saved pod and shows the empty + loading states', () => {
    mockedMyPods.mockReturnValue({ savedPods: [pod('1')], historyPods: [], isLoading: false });
    const { rerender } = renderWithProviders(<SavedScreen />);
    fireEvent.press(screen.getByTestId('pod-card-p-1'));
    expect(mockOpenPod).toHaveBeenCalled();

    mockedMyPods.mockReturnValue({ savedPods: [], historyPods: [], isLoading: false });
    rerender(<SavedScreen />);
    expect(screen.getByTestId('saved-list-empty')).toBeOnTheScreen();

    mockedMyPods.mockReturnValue({ savedPods: [], historyPods: [], isLoading: true });
    rerender(<SavedScreen />);
    expect(screen.getByTestId('saved-list-loading')).toBeOnTheScreen();
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
