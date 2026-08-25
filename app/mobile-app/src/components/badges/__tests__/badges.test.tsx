import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { BadgeProgressCard, ProfileBadgesStrip, type BadgeRowShape } from '@/components/badges';
import { graphqlRequest } from '@/services/graphql.client';
import { renderWithProviders } from '@/utils/test-utils';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));

const mockRequest = graphqlRequest as jest.Mock;

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

beforeEach(() => {
  jest.clearAllMocks();
  mockRequest.mockResolvedValue({ myBadgeProgress: [] });
});

describe('BadgeProgressCard', () => {
  it('states the goal, the window it must happen in, and the progress', () => {
    renderWithProviders(<BadgeProgressCard row={row()} />);
    expect(screen.getByText('Attend 10 pods')).toBeOnTheScreen();
    expect(screen.getByText('Counts everything since you joined Duncit')).toBeOnTheScreen();
    expect(screen.getByText('4 / 10')).toBeOnTheScreen();
    expect(screen.getByText('Locked')).toBeOnTheScreen();
  });

  // The bar must not slide backwards under an "Achieved" chip when the metric
  // drifts below the threshold again (a cancelled ticket).
  it('pins an earned badge full and names the day it was earned', () => {
    renderWithProviders(
      <BadgeProgressCard
        row={row({ achieved: true, current: 12, achieved_at: '2026-03-14T00:00:00.000Z' })}
      />,
    );
    expect(screen.getByText('Achieved')).toBeOnTheScreen();
    expect(screen.getByTestId('badge-bar-b-legend').props.style).toEqual(
      expect.objectContaining({ width: '100%' }),
    );
    expect(screen.getByText('10 / 10')).toBeOnTheScreen();
  });

  it('reads the monthly badge’s own window, not the lifetime one', () => {
    renderWithProviders(
      <BadgeProgressCard
        row={row({
          target: 6,
          current: 2,
          badge: {
            id: 'b-monthly',
            title: 'Monthly Maverick',
            description: '',
            image_url: '',
            condition_type: 'MONTHLY_POD_ATTEND_COUNT',
            threshold: 6,
          },
        })}
      />,
    );
    expect(screen.getByText('Must all happen inside one calendar month')).toBeOnTheScreen();
  });
});

describe('ProfileBadgesStrip', () => {
  it('nudges a member who has not unlocked anything yet', async () => {
    renderWithProviders(<ProfileBadgesStrip />);
    await waitFor(() => expect(mockRequest).toHaveBeenCalled());
    expect(screen.getByText(/No badges yet/i)).toBeOnTheScreen();
  });

  // The profile shows what has been WON — the locked ones live on /badges.
  it('shows only the earned badges and opens the full list', async () => {
    mockRequest.mockResolvedValue({
      myBadgeProgress: [
        row({ achieved: true, current: 12, achieved_at: '2026-03-14T00:00:00.000Z' }),
        row({
          badge: {
            id: 'b-spark',
            title: 'Social Spark',
            description: '',
            image_url: '',
            condition_type: 'PLUS_ONE_POD_COUNT',
            threshold: 10,
          },
        }),
      ],
    });
    renderWithProviders(<ProfileBadgesStrip />);
    await waitFor(() => expect(screen.getByText('Legend')).toBeOnTheScreen());
    expect(screen.queryByText('Social Spark')).toBeNull();

    fireEvent.press(screen.getByTestId('profile-badges-view-all'));
    expect(mockNavigate).toHaveBeenCalledWith('Badges');
  });

  // A failed read must leave the profile standing, not blank the section.
  it('renders the empty state when the read fails', async () => {
    mockRequest.mockRejectedValue(new Error('offline'));
    renderWithProviders(<ProfileBadgesStrip />);
    await waitFor(() => expect(screen.getByText(/No badges yet/i)).toBeOnTheScreen());
  });
});
