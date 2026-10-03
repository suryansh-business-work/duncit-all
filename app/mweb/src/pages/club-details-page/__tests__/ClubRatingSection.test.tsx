import { describe, expect, it, vi, beforeEach } from 'vitest';
import { type MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';

import ClubRatingSection from '../ClubRatingSection';
import { ADD_CLUB_RATING, CLUB_RATINGS } from '../../ClubDetailsPage/clubDetailsQueries';

const h = vi.hoisted(() => ({ notify: vi.fn() }));
vi.mock('../../../components/notify', () => ({ notify: h.notify }));

const CLUB_ID = 'club-1';

const review = (id: string, over: Record<string, unknown> = {}) => ({
  id,
  user_id: `u-${id}`,
  user_name: `Reviewer ${id}`,
  user_photo: null,
  stars: 5,
  comment: `Comment ${id}`,
  created_at: '2026-09-01T10:00:00.000Z',
  ...over,
});

const ratingsMock = (reviews: unknown[]): MockedResponse => ({
  request: { query: CLUB_RATINGS, variables: { id: CLUB_ID } },
  result: { data: { clubRatings: reviews } },
  // The submit refetches the list, so the same answer is served twice.
  maxUsageCount: 2,
});

function renderSection(mocks: MockedResponse[], props: Partial<{ rating: number; ratingsCount: number }> = {}) {
  return render(
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={mocks}>
      <ClubRatingSection clubId={CLUB_ID} rating={props.rating ?? 0} ratingsCount={props.ratingsCount ?? 0} />
    </MockedProvider>,
  );
}

const openDialog = async () => {
  fireEvent.click(screen.getByTestId('club-ratings-rate'));
  return screen.findByRole('dialog');
};

beforeEach(() => h.notify.mockReset());

describe('ClubRatingSection', () => {
  it('invites the first review when the club has no ratings', () => {
    renderSection([ratingsMock([])]);
    expect(screen.getByRole('heading', { name: 'Ratings & Reviews' })).toBeInTheDocument();
    expect(screen.getByText('No ratings yet. Be the first to review!')).toBeInTheDocument();
    expect(screen.queryByText(/ratings$/)).not.toBeInTheDocument();
  });

  it('shows the average to one decimal and the rating count', () => {
    renderSection([ratingsMock([])], { rating: 4.4, ratingsCount: 12 });
    expect(screen.getByText('4.4')).toBeInTheDocument();
    expect(screen.getByText('12 ratings')).toBeInTheDocument();
    expect(screen.queryByText(/No ratings yet/)).not.toBeInTheDocument();
  });

  it('lists at most the three latest reviews, with comments only when present', async () => {
    renderSection(
      [
        ratingsMock([
          review('r1'),
          review('r2', { comment: '' }),
          review('r3', { user_name: null }),
          review('r4'),
        ]),
      ],
      { rating: 4.8, ratingsCount: 4 },
    );

    const first = await screen.findByTestId('club-rating-review-r1');
    expect(within(first).getByText('Reviewer r1')).toBeInTheDocument();
    expect(within(first).getByText('Comment r1')).toBeInTheDocument();
    expect(within(first).getByRole('img', { name: '5 Stars' })).toBeInTheDocument();

    // An empty comment renders no secondary line at all.
    const second = screen.getByTestId('club-rating-review-r2');
    expect(within(second).getByText('Reviewer r2')).toBeInTheDocument();
    expect(within(second).queryByText(/Comment/)).not.toBeInTheDocument();

    expect(screen.getByTestId('club-rating-review-r3')).toBeInTheDocument();
    expect(screen.queryByTestId('club-rating-review-r4')).not.toBeInTheDocument();
  });

  it('keeps Submit disabled until a star is chosen and counts comment characters', async () => {
    renderSection([ratingsMock([])]);
    const dialog = await openDialog();

    expect(within(dialog).getByText('Rate this Club')).toBeInTheDocument();
    expect(screen.getByTestId('club-rating-dialog-submit')).toBeDisabled();
    expect(within(dialog).getByText('0/500')).toBeInTheDocument();

    fireEvent.change(screen.getByTestId('club-rating-dialog-comment-input'), {
      target: { value: 'Great' },
    });
    expect(within(dialog).getByText('5/500')).toBeInTheDocument();
    expect(screen.getByTestId('club-rating-dialog-submit')).toBeDisabled();

    fireEvent.click(within(dialog).getByLabelText('3 Stars'));
    expect(screen.getByTestId('club-rating-dialog-submit')).toBeEnabled();
  });

  it('submits the stars with a trimmed comment, thanks the member and resets the form', async () => {
    const sent = vi.fn();
    const addMock: MockedResponse = {
      request: {
        query: ADD_CLUB_RATING,
        variables: (vars: Record<string, unknown>) => {
          sent(vars);
          return true;
        },
      },
      delay: 30,
      result: { data: { addClubRating: { id: CLUB_ID, rating: 4, ratings_count: 1 } } },
    };
    renderSection([ratingsMock([]), addMock]);
    const dialog = await openDialog();

    fireEvent.click(within(dialog).getByLabelText('4 Stars'));
    fireEvent.change(screen.getByTestId('club-rating-dialog-comment-input'), {
      target: { value: '  Lovely people  ' },
    });
    fireEvent.click(screen.getByTestId('club-rating-dialog-submit'));

    await waitFor(() =>
      expect(screen.getByTestId('club-rating-dialog-submit')).toHaveTextContent('Submitting…'),
    );
    expect(screen.getByTestId('club-rating-dialog-submit')).toBeDisabled();
    await waitFor(() => expect(h.notify).toHaveBeenCalledWith('Thanks for your rating!', 'success'));
    expect(sent).toHaveBeenCalledWith(
      expect.objectContaining({ clubId: CLUB_ID, stars: 4, comment: 'Lovely people' }),
    );
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    // Reopening starts from a clean form.
    const reopened = await openDialog();
    expect(screen.getByTestId('club-rating-dialog-submit')).toBeDisabled();
    expect(within(reopened).getByText('0/500')).toBeInTheDocument();
  });

  it('sends no comment when only whitespace was typed', async () => {
    const sent = vi.fn();
    const addMock: MockedResponse = {
      request: {
        query: ADD_CLUB_RATING,
        variables: (vars: Record<string, unknown>) => {
          sent(vars);
          return true;
        },
      },
      result: { data: { addClubRating: { id: CLUB_ID, rating: 5, ratings_count: 1 } } },
    };
    renderSection([ratingsMock([]), addMock]);
    const dialog = await openDialog();

    fireEvent.click(within(dialog).getByLabelText('5 Stars'));
    fireEvent.change(screen.getByTestId('club-rating-dialog-comment-input'), { target: { value: '   ' } });
    fireEvent.click(screen.getByTestId('club-rating-dialog-submit'));

    await waitFor(() => expect(h.notify).toHaveBeenCalledWith('Thanks for your rating!', 'success'));
    expect(sent.mock.calls[0][0].comment).toBeUndefined();
  });

  it('reports the server error and keeps the dialog open when the rating fails', async () => {
    const addMock: MockedResponse = {
      request: { query: ADD_CLUB_RATING, variables: () => true },
      result: { errors: [{ message: 'You have already rated this club' }] },
    };
    renderSection([ratingsMock([]), addMock]);
    const dialog = await openDialog();

    fireEvent.click(within(dialog).getByLabelText('2 Stars'));
    fireEvent.click(screen.getByTestId('club-rating-dialog-submit'));

    await waitFor(() =>
      expect(h.notify).toHaveBeenCalledWith(
        expect.stringContaining('You have already rated this club'),
        'error',
      ),
    );
    expect(h.notify).not.toHaveBeenCalledWith('Thanks for your rating!', 'success');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByTestId('club-rating-dialog-submit')).toBeEnabled();
  });

  it('closes the dialog from Cancel without submitting', async () => {
    renderSection([ratingsMock([])]);
    await openDialog();
    fireEvent.click(screen.getByTestId('club-rating-dialog-cancel'));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(h.notify).not.toHaveBeenCalled();
  });
});
