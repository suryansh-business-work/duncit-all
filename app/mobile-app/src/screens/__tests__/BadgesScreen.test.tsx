import { screen } from '@testing-library/react-native';

import { BadgesScreen } from '@/screens/BadgesScreen';
import { useBadges } from '@/hooks/useBadges';
import type { BadgeRowShape } from '@/components/badges';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/hooks/useBadges', () => ({ useBadges: jest.fn() }));
// The screen's scaffold reads navigation for its back control.
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ canGoBack: () => true, goBack: jest.fn(), navigate: jest.fn() }),
}));

const mockUseBadges = useBadges as jest.Mock;

const row = (over: Partial<BadgeRowShape> = {}): BadgeRowShape => ({
  current: 4,
  target: 10,
  achieved: false,
  achieved_at: null,
  badge: {
    id: 'b-legend',
    title: 'Legend',
    description: 'Attend 10 or more pods.',
    image_url: '',
    condition_type: 'POD_ATTEND_COUNT',
    threshold: 10,
    ...over.badge,
  },
  ...over,
});

// `rows` is loosened on the way in: BadgeRowShape types `condition_type` as a
// plain string (it is the framework-free view shape), while the hook's own rows
// carry the generated BadgeConditionType enum. The mock only has to render.
const state = (over: { rows?: BadgeRowShape[]; isLoading?: boolean; hasError?: boolean } = {}) =>
  mockUseBadges.mockReturnValue({ rows: [], isLoading: false, hasError: false, ...over });

beforeEach(() => {
  jest.clearAllMocks();
  state();
});

describe('BadgesScreen', () => {
  it('spins while the catalogue is loading', () => {
    state({ isLoading: true });
    renderWithProviders(<BadgesScreen />);
    expect(screen.getByTestId('badges-loading')).toBeOnTheScreen();
  });

  it('says so when the catalogue could not be read', () => {
    state({ hasError: true });
    renderWithProviders(<BadgesScreen />);
    expect(screen.getByTestId('badges-error')).toBeOnTheScreen();
  });

  it('says so when nothing has been published yet', () => {
    renderWithProviders(<BadgesScreen />);
    expect(screen.getByTestId('badges-empty')).toBeOnTheScreen();
  });

  // The point of the screen is what is still to be won, so a locked badge is
  // listed with its goal rather than hidden.
  it('lists locked and earned badges together, earned first', () => {
    const earned = row({
      current: 12,
      achieved: true,
      achieved_at: '2026-03-14T00:00:00.000Z',
      badge: {
        id: 'b-spark',
        title: 'Social Spark',
        description: '',
        image_url: '',
        condition_type: 'PLUS_ONE_POD_COUNT',
        threshold: 10,
      },
    });
    state({ rows: [row(), earned] });
    renderWithProviders(<BadgesScreen />);

    expect(screen.getByTestId('badge-card-b-legend')).toBeOnTheScreen();
    expect(screen.getByTestId('badge-card-b-spark')).toBeOnTheScreen();
    // Sorted: the achieved badge is rendered before the locked one.
    const cards = screen.getAllByTestId(/^badge-card-/);
    expect(cards[0]?.props.testID).toBe('badge-card-b-spark');
  });
});
