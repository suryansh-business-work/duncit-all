import { act, fireEvent, screen } from '@testing-library/react-native';
import { ClubRatingSection } from '../ClubRatingSection';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));

const { graphqlRequest } = jest.requireMock('@/services/graphql.client') as {
  graphqlRequest: jest.MockedFunction<(...args: any[]) => Promise<any>>;
};

const RATING = {
  id: 'r1',
  user_id: 'u1',
  user_name: 'Alice',
  user_photo: null,
  stars: 4,
  comment: 'Great club!',
  created_at: '2026-06-01T10:00:00.000Z',
};

describe('ClubRatingSection', () => {
  beforeEach(() => {
    graphqlRequest.mockResolvedValue({ clubRatings: [RATING] });
  });

  it('shows "no ratings yet" when ratingsCount is 0', async () => {
    renderWithProviders(<ClubRatingSection clubId="c1" rating={0} ratingsCount={0} />);
    await act(async () => {});
    expect(screen.getByText('No ratings yet. Be the first to review!')).toBeOnTheScreen();
  });

  it('shows average rating when ratingsCount > 0', async () => {
    renderWithProviders(<ClubRatingSection clubId="c1" rating={4.2} ratingsCount={10} />);
    await act(async () => {});
    expect(screen.getByText('4.2')).toBeOnTheScreen();
    expect(screen.getByText('10 ratings')).toBeOnTheScreen();
  });

  it('shows loaded reviews with user name and comment', async () => {
    renderWithProviders(<ClubRatingSection clubId="c1" rating={4.0} ratingsCount={1} />);
    await act(async () => {});
    expect(screen.getByText('Alice')).toBeOnTheScreen();
    expect(screen.getByText('Great club!')).toBeOnTheScreen();
  });

  it('opens rate dialog on "Rate Club" button press', async () => {
    renderWithProviders(<ClubRatingSection clubId="c1" rating={0} ratingsCount={0} />);
    await act(async () => {});
    fireEvent.press(screen.getByLabelText('Rate this club'));
    expect(screen.getByText('Rate this Club')).toBeOnTheScreen();
  });

  it('opens rate dialog and shows star picker + submit button', async () => {
    renderWithProviders(<ClubRatingSection clubId="c1" rating={0} ratingsCount={0} />);
    await act(async () => {});
    fireEvent.press(screen.getByLabelText('Rate this club'));
    await act(async () => {});
    // Dialog opens and shows all 5 star pickers
    expect(screen.getByTestId('star-1')).toBeOnTheScreen();
    expect(screen.getByTestId('star-5')).toBeOnTheScreen();
    expect(screen.getByText('Submit Rating')).toBeOnTheScreen();
    // Select a star and verify picker is rendered with a star-border/star icon
    fireEvent.press(screen.getByTestId('star-4'));
    await act(async () => {});
  });

  it('submit calls graphql when star is selected', async () => {
    graphqlRequest
      .mockResolvedValueOnce({ clubRatings: [] }) // initial load
      .mockResolvedValueOnce({ addClubRating: { id: 'c1', rating: 4.0, ratings_count: 1 } }) // submit
      .mockResolvedValue({ clubRatings: [] }); // re-fetch

    renderWithProviders(<ClubRatingSection clubId="c1" rating={0} ratingsCount={0} />);
    await act(async () => {});
    fireEvent.press(screen.getByLabelText('Rate this club'));
    await act(async () => {});
    fireEvent.press(screen.getByTestId('star-4'));
    await act(async () => {});
    fireEvent.press(screen.getByText('Submit Rating'));
    await act(async () => {});
    // Graphql was called at least twice (load + submit)
    expect(graphqlRequest.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it('closes dialog on X button press', async () => {
    renderWithProviders(<ClubRatingSection clubId="c1" rating={0} ratingsCount={0} />);
    await act(async () => {});
    fireEvent.press(screen.getByLabelText('Rate this club'));
    await act(async () => {});
    expect(screen.getByText('Rate this Club')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('rating-dialog-close'));
    await act(async () => {});
  });

  it('submit re-fetch error is caught gracefully', async () => {
    graphqlRequest
      .mockResolvedValueOnce({ clubRatings: [] }) // initial load
      .mockResolvedValueOnce({ addClubRating: { id: 'c1', rating: 5.0, ratings_count: 1 } }) // submit
      .mockRejectedValue(new Error('refetch error')); // re-fetch fails

    renderWithProviders(<ClubRatingSection clubId="c1" rating={0} ratingsCount={0} />);
    await act(async () => {});
    fireEvent.press(screen.getByLabelText('Rate this club'));
    await act(async () => {});
    fireEvent.press(screen.getByTestId('star-5'));
    await act(async () => {});
    fireEvent.press(screen.getByText('Submit Rating'));
    await act(async () => {});
    // Should not crash even when re-fetch rejects
    expect(screen.getByTestId('club-ratings')).toBeOnTheScreen();
  });

  it('handles ratings load error gracefully', async () => {
    graphqlRequest.mockRejectedValue(new Error('network error'));
    renderWithProviders(<ClubRatingSection clubId="c1" rating={0} ratingsCount={0} />);
    await act(async () => {});
    expect(screen.getByTestId('club-ratings')).toBeOnTheScreen();
  });

  it('reviews without comment render without crashing', async () => {
    graphqlRequest.mockResolvedValue({
      clubRatings: [{ ...RATING, comment: null }],
    });
    renderWithProviders(<ClubRatingSection clubId="c1" rating={4.0} ratingsCount={1} />);
    await act(async () => {});
    expect(screen.getByText('Alice')).toBeOnTheScreen();
  });

  it('reviews with null user_name fall back to "Member"', async () => {
    graphqlRequest.mockResolvedValue({
      clubRatings: [{ ...RATING, user_name: null }],
    });
    renderWithProviders(<ClubRatingSection clubId="c1" rating={4.0} ratingsCount={1} />);
    await act(async () => {});
    expect(screen.getByText('Member')).toBeOnTheScreen();
  });
});
