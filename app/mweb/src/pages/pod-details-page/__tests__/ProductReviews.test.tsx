import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MockedProvider, type MockedResponse } from '@apollo/client/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ProductReviews from '../ProductReviews';
import { CREATE_PRODUCT_REVIEW, PRODUCT_REVIEWS, VOTE_PRODUCT_REVIEW } from '../queries';
import { GET_IMAGEKIT_AUTH } from '../../../utils/imagekit';

const PRODUCT_ID = 'prod-1';

const oneReview = {
  id: 'r1',
  user_name: 'Alice',
  rating: 5,
  comment: 'Great product',
  images: ['https://cdn/reviews/a.png'],
  up_votes: 3,
  down_votes: 1,
  my_vote: 1,
  seller_reply: 'Thank you!',
  seller_reply_at: '2026-01-01T00:00:00Z',
  created_at: '2026-01-01T00:00:00Z',
};

const emptyNameReview = {
  ...oneReview,
  id: 'r2',
  user_name: '',
  rating: 4,
  comment: '',
  images: [],
  up_votes: 0,
  down_votes: 0,
  my_vote: -1,
  seller_reply: '',
  seller_reply_at: null,
};

function reviewsMock(reviews: unknown[], total: number): MockedResponse {
  return {
    request: { query: PRODUCT_REVIEWS, variables: { id: PRODUCT_ID } },
    result: {
      data: {
        productReviewSummary: { average_rating: 4.5, total, star_counts: [0, 0, 0, 1, 1] },
        productReviews: reviews,
      },
    },
  };
}

const emptySummaryMock: MockedResponse = {
  request: { query: PRODUCT_REVIEWS, variables: { id: PRODUCT_ID } },
  result: {
    data: {
      productReviewSummary: { average_rating: 0, total: 0, star_counts: [0, 0, 0, 0, 0] },
      productReviews: [],
    },
  },
};

const authMock: MockedResponse = {
  request: { query: GET_IMAGEKIT_AUTH },
  variableMatcher: () => true,
  result: {
    data: {
      getImagekitAuth: {
        token: 't',
        expire: 1,
        signature: 's',
        publicKey: 'pk',
        urlEndpoint: 'https://ik',
      },
    },
  },
};

function createMock(images: string[]): MockedResponse {
  return {
    request: {
      query: CREATE_PRODUCT_REVIEW,
      variables: { input: { product_id: PRODUCT_ID, rating: 4, comment: 'Nice', images } },
    },
    result: { data: { createProductReview: { id: 'new-1' } } },
  };
}

function voteMock(reviewId: string, vote: number): MockedResponse {
  return {
    request: { query: VOTE_PRODUCT_REVIEW, variables: { review_id: reviewId, vote } },
    result: {
      data: {
        voteProductReview: { id: reviewId, up_votes: 4, down_votes: 1, my_vote: vote },
      },
    },
  };
}

const fileInput = () => document.querySelector('input[type="file"]') as HTMLInputElement;

function renderReviews(mocks: MockedResponse[]) {
  return render(
    <MockedProvider mocks={mocks}>
      <ProductReviews productId={PRODUCT_ID} />
    </MockedProvider>,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('ProductReviews', () => {
  it('shows a loading spinner before data resolves', () => {
    renderReviews([reviewsMock([oneReview], 2)]);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.getByText('Write a review')).toBeInTheDocument();
  });

  it('renders the summary and a populated review with seller reply and images', async () => {
    renderReviews([reviewsMock([oneReview], 2)]);
    expect(await screen.findByText('Alice')).toBeInTheDocument();
    expect(screen.getByText(/4.5 · 2 reviews/)).toBeInTheDocument();
    expect(screen.getByText('Great product')).toBeInTheDocument();
    expect(screen.getByText('Seller response')).toBeInTheDocument();
    expect(screen.getByText('Thank you!')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('renders singular "review" label and a fallback avatar initial for empty name', async () => {
    renderReviews([reviewsMock([emptyNameReview], 1)]);
    expect(await screen.findByText(/4.5 · 1 review$/)).toBeInTheDocument();
    // Fallback initial 'U' when user_name is empty
    expect(screen.getByText('U')).toBeInTheDocument();
  });

  it('shows the empty state when there are no reviews', async () => {
    renderReviews([emptySummaryMock]);
    expect(await screen.findByText(/No reviews yet/)).toBeInTheDocument();
  });

  it('validates the star rating before submitting', async () => {
    renderReviews([reviewsMock([], 0)]);
    await screen.findByText(/No reviews yet/);
    fireEvent.click(screen.getByRole('button', { name: /submit review/i }));
    expect(await screen.findByText('Please pick a star rating.')).toBeInTheDocument();
  });

  it('submits a review with a rating and comment, then clears the form', async () => {
    renderReviews([
      reviewsMock([], 0),
      createMock([]),
      reviewsMock([oneReview], 2),
    ]);
    await screen.findByText(/No reviews yet/);

    // Pick 4 stars
    const stars = screen.getAllByRole('radio');
    fireEvent.click(stars.find((s) => s.getAttribute('value') === '4')!);

    const textbox = screen.getByPlaceholderText(/Share your experience/i);
    fireEvent.change(textbox, { target: { value: 'Nice' } });
    expect(textbox).toHaveValue('Nice');

    fireEvent.click(screen.getByRole('button', { name: /submit review/i }));

    await waitFor(() => expect(textbox).toHaveValue(''));
    expect(await screen.findByText('Alice')).toBeInTheDocument();
  });

  it('surfaces a mutation error message on submit failure', async () => {
    const failCreate: MockedResponse = {
      request: {
        query: CREATE_PRODUCT_REVIEW,
        variables: { input: { product_id: PRODUCT_ID, rating: 4, comment: '', images: [] } },
      },
      error: new Error('Server exploded'),
    };
    renderReviews([reviewsMock([], 0), failCreate]);
    await screen.findByText(/No reviews yet/);
    const stars = screen.getAllByRole('radio');
    fireEvent.click(stars.find((s) => s.getAttribute('value') === '4')!);
    fireEvent.click(screen.getByRole('button', { name: /submit review/i }));
    expect(await screen.findByText('Server exploded')).toBeInTheDocument();
  });

  it('uploads a photo, previews it and lets the user remove it', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ url: 'https://cdn/reviews/up.png' }) }),
    );
    renderReviews([reviewsMock([], 0), authMock]);
    await screen.findByText(/No reviews yet/);

    fireEvent.change(fileInput(), {
      target: { files: [new File(['x'], 'up.png', { type: 'image/png' })] },
    });

    const preview = await screen.findByAltText('Review');
    expect(preview).toHaveAttribute('src', 'https://cdn/reviews/up.png');

    // Remove the uploaded image (CloseIcon button)
    const removeBtn = preview.closest('div')?.querySelector('button') as HTMLButtonElement;
    fireEvent.click(removeBtn);
    await waitFor(() => expect(screen.queryByAltText('Review')).not.toBeInTheDocument());
  });

  it('shows an error when the image upload fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, json: async () => ({ message: 'boom' }) }),
    );
    renderReviews([reviewsMock([], 0), authMock]);
    await screen.findByText(/No reviews yet/);
    fireEvent.change(fileInput(), {
      target: { files: [new File(['x'], 'up.png', { type: 'image/png' })] },
    });
    expect(await screen.findByText('Could not upload the image.')).toBeInTheDocument();
  });

  it('ignores a file change with no selected file', async () => {
    renderReviews([reviewsMock([], 0)]);
    await screen.findByText(/No reviews yet/);
    fireEvent.change(fileInput(), { target: { files: [] } });
    // No preview appears
    expect(screen.queryByAltText('Review')).not.toBeInTheDocument();
  });

  it('toggles an up-vote off (my_vote already 1) and refetches', async () => {
    renderReviews([reviewsMock([oneReview], 2), voteMock('r1', 0), reviewsMock([oneReview], 2)]);
    await screen.findByText('Alice');
    // The first IconButton in the vote row is thumbs-up
    const upButtons = screen.getAllByRole('button');
    const thumbUp = upButtons.find((b) => b.querySelector('svg[data-testid="ThumbUpOffAltIcon"]'))!;
    fireEvent.click(thumbUp);
    await waitFor(() => expect(thumbUp).toBeInTheDocument());
  });

  it('casts a down-vote (my_vote was 1, value -1)', async () => {
    renderReviews([reviewsMock([oneReview], 2), voteMock('r1', -1), reviewsMock([oneReview], 2)]);
    await screen.findByText('Alice');
    const buttons = screen.getAllByRole('button');
    const thumbDown = buttons.find((b) => b.querySelector('svg[data-testid="ThumbDownOffAltIcon"]'))!;
    fireEvent.click(thumbDown);
    await waitFor(() => expect(thumbDown).toBeInTheDocument());
  });
});
