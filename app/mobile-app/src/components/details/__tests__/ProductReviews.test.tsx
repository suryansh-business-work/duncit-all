import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';

import { ProductReviews } from '@/components/details/ProductReviews';
import { graphqlRequest } from '@/services/graphql.client';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
const mockRequest = graphqlRequest as jest.Mock;
const mockPick = jest.fn();
let mockUploading = false;
let mockUploadUrl: string | null = 'https://cdn/new.jpg';
jest.mock('@/hooks/useMediaUpload', () => ({
  useMediaUpload: (_folder: string, onUploaded: (url: string) => void) => {
    // pick() simulates the full pick → crop → confirm → upload round-trip.
    mockPick.mockImplementation(() => {
      if (mockUploadUrl) onUploaded(mockUploadUrl);
    });
    return {
      uploading: mockUploading,
      pending: null,
      stage: 'processing' as const,
      progress: null,
      error: undefined,
      pick: mockPick,
      confirm: jest.fn(),
      cancel: jest.fn(),
    };
  },
}));
jest.mock('@/hooks/useUploadSettings', () => ({ useUploadSettings: () => null }));

const REVIEWS = [
  {
    id: 'rv1',
    user_name: 'Asha',
    rating: 5,
    comment: 'Great sticks',
    images: ['https://cdn/r.jpg'],
    up_votes: 2,
    down_votes: 0,
    my_vote: 0,
    seller_reply: 'Thanks!',
    seller_reply_at: '2027-01-01',
  },
  {
    id: 'rv2',
    user_name: 'Bob',
    rating: 3,
    comment: '',
    images: [],
    up_votes: 0,
    down_votes: 1,
    my_vote: -1,
    seller_reply: '',
    seller_reply_at: null,
  },
  {
    id: 'rv3',
    user_name: 'Cara',
    rating: 4,
    comment: 'Solid',
    images: [],
    up_votes: 3,
    down_votes: 0,
    my_vote: 1,
    seller_reply: '',
    seller_reply_at: null,
  },
];

const routeReviews = (reviews = REVIEWS, total = 3, avg = 4) => {
  mockRequest.mockImplementation((_doc: unknown, vars: any) => {
    if (vars?.input) return Promise.resolve({ createProductReview: { id: 'new' } });
    if (vars?.review_id !== undefined) {
      return Promise.resolve({
        voteProductReview: { id: vars.review_id, up_votes: 1, down_votes: 0, my_vote: 1 },
      });
    }
    return Promise.resolve({
      productReviewSummary: { average_rating: avg, total, star_counts: [0, 0, 1, 0, 1] },
      productReviews: reviews,
    });
  });
};

const opName = (doc: { definitions?: { name?: { value?: string } }[] }) =>
  doc?.definitions?.[0]?.name?.value;

beforeEach(() => {
  mockRequest.mockReset();
  mockPick.mockClear();
  mockUploading = false;
  mockUploadUrl = 'https://cdn/new.jpg';
});

describe('ProductReviews', () => {
  it('shows the summary and the review list (comment, images, seller reply)', async () => {
    routeReviews();
    renderWithProviders(<ProductReviews productId="pr1" />);
    await waitFor(() => expect(screen.getByText('Great sticks')).toBeOnTheScreen());
    expect(screen.getByText('4 · 3 reviews')).toBeOnTheScreen();
    expect(screen.getByText('Asha')).toBeOnTheScreen();
    expect(screen.getByText('Seller response')).toBeOnTheScreen();
    expect(screen.getByText('Thanks!')).toBeOnTheScreen();
  });

  it('uses the singular "review" label for a single review', async () => {
    routeReviews(REVIEWS.slice(0, 1), 1, 5);
    renderWithProviders(<ProductReviews productId="pr1" />);
    await waitFor(() => expect(screen.getByText('5 · 1 review')).toBeOnTheScreen());
  });

  it('tolerates a failed reviews load (shows the empty state)', async () => {
    mockRequest.mockRejectedValue(new Error('offline'));
    renderWithProviders(<ProductReviews productId="pr1" />);
    await waitFor(() => expect(screen.getByText(/No reviews yet/)).toBeOnTheScreen());
  });

  it('shows the empty state when there are no reviews', async () => {
    routeReviews([], 0, 0);
    renderWithProviders(<ProductReviews productId="pr1" />);
    await waitFor(() => expect(screen.getByText(/No reviews yet/)).toBeOnTheScreen());
  });

  it('blocks submit without a rating, then submits with one and reloads', async () => {
    routeReviews();
    renderWithProviders(<ProductReviews productId="pr1" />);
    await waitFor(() => expect(screen.getByTestId('review-submit')).toBeOnTheScreen());

    // No rating → inline error, no create call.
    fireEvent.press(screen.getByTestId('review-submit'));
    expect(await screen.findByTestId('review-error')).toHaveTextContent(/pick a star rating/i);
    expect(
      mockRequest.mock.calls.filter((c) => opName(c[0]) === 'MobileCreateProductReview'),
    ).toHaveLength(0);

    // Pick 4 stars + comment → submit.
    fireEvent.press(screen.getByTestId('star-4'));
    fireEvent.changeText(screen.getByTestId('review-comment'), 'Nice');
    fireEvent.press(screen.getByTestId('review-submit'));
    await waitFor(() =>
      expect(mockRequest.mock.calls.some((c) => opName(c[0]) === 'MobileCreateProductReview')).toBe(
        true,
      ),
    );
  });

  it('votes a review (thumbs up)', async () => {
    routeReviews();
    renderWithProviders(<ProductReviews productId="pr1" />);
    await waitFor(() => expect(screen.getByTestId('review-up-rv1')).toBeOnTheScreen());
    fireEvent.press(screen.getByTestId('review-up-rv1'));
    await waitFor(() =>
      expect(mockRequest.mock.calls.some((c) => opName(c[0]) === 'MobileVoteProductReview')).toBe(
        true,
      ),
    );
    // Down-vote the second review too (covers the down branch).
    fireEvent.press(screen.getByTestId('review-down-rv2'));
  });

  it('uploads a photo and submits the review with the image', async () => {
    routeReviews([], 0, 0);
    renderWithProviders(<ProductReviews productId="pr1" />);
    await waitFor(() => expect(screen.getByTestId('review-add-photo')).toBeOnTheScreen());
    await act(async () => {
      fireEvent.press(screen.getByTestId('review-add-photo'));
    });
    fireEvent.press(screen.getByTestId('star-5'));
    fireEvent.press(screen.getByTestId('review-submit'));
    await waitFor(() => {
      const call = mockRequest.mock.calls.find((c) => opName(c[0]) === 'MobileCreateProductReview');
      expect(call?.[1].input.images).toEqual(['https://cdn/new.jpg']);
    });
  });

  it('ignores a cancelled photo pick', async () => {
    mockUploadUrl = null;
    routeReviews([], 0, 0);
    renderWithProviders(<ProductReviews productId="pr1" />);
    await waitFor(() => expect(screen.getByTestId('review-add-photo')).toBeOnTheScreen());
    await act(async () => {
      fireEvent.press(screen.getByTestId('review-add-photo'));
    });
    fireEvent.press(screen.getByTestId('star-4'));
    fireEvent.press(screen.getByTestId('review-submit'));
    await waitFor(() => {
      const call = mockRequest.mock.calls.find((c) => opName(c[0]) === 'MobileCreateProductReview');
      expect(call?.[1].input.images).toEqual([]);
    });
  });

  it('shows the uploading state on the add-photo control', async () => {
    mockUploading = true;
    routeReviews([], 0, 0);
    renderWithProviders(<ProductReviews productId="pr1" />);
    await waitFor(() => expect(screen.getByText('Uploading…')).toBeOnTheScreen());
  });

  it('surfaces a submit failure', async () => {
    mockRequest.mockImplementation((_doc: unknown, vars: any) => {
      if (vars?.input) return Promise.reject(new Error('down'));
      return Promise.resolve({
        productReviewSummary: { average_rating: 0, total: 0, star_counts: [0, 0, 0, 0, 0] },
        productReviews: [],
      });
    });
    renderWithProviders(<ProductReviews productId="pr1" />);
    await waitFor(() => expect(screen.getByTestId('review-submit')).toBeOnTheScreen());
    fireEvent.press(screen.getByTestId('star-5'));
    fireEvent.press(screen.getByTestId('review-submit'));
    expect(await screen.findByTestId('review-error')).toHaveTextContent(/Could not submit/i);
  });
});
