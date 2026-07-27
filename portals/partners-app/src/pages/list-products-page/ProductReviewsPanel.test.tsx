import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MockedProvider, type MockedResponse } from '@apollo/client/testing';
import { gql } from '@apollo/client';
import ProductReviewsPanel from './ProductReviewsPanel';

afterEach(cleanup);

// Same documents the panel declares privately — MockedProvider matches on the
// printed document, so a renamed field here is a renamed field there.
const PRODUCT_REVIEWS = gql`
  query PartnerProductReviews($id: ID!) {
    productReviewSummary(product_id: $id) {
      average_rating
      total
    }
    productReviews(product_id: $id) {
      id
      user_name
      rating
      comment
      images
      up_votes
      down_votes
      seller_reply
    }
  }
`;

const REPLY_TO_REVIEW = gql`
  mutation ReplyToProductReview($review_id: ID!, $reply: String!) {
    replyToProductReview(review_id: $review_id, reply: $reply) {
      id
      seller_reply
    }
  }
`;

const review = (over: Partial<Record<string, unknown>> = {}) => ({
  __typename: 'ProductReview',
  id: 'r1',
  user_name: 'Asha',
  rating: 5,
  comment: 'Fits perfectly',
  images: [],
  up_votes: 7,
  down_votes: 1,
  seller_reply: '',
  ...over,
});

const reviewsMock = (
  reviews: unknown[],
  summary: { average_rating: number; total: number } | null,
): MockedResponse => ({
  request: { query: PRODUCT_REVIEWS, variables: { id: 'prod-1' } },
  result: {
    data: {
      productReviewSummary: summary && { __typename: 'ProductReviewSummary', ...summary },
      productReviews: reviews,
    },
  },
});

const renderPanel = (mocks: MockedResponse[]) =>
  render(
    <MockedProvider mocks={mocks}>
      <ProductReviewsPanel productId="prod-1" />
    </MockedProvider>,
  );

describe('ProductReviewsPanel', () => {
  it('shows a spinner until the reviews arrive, then the summary line and each review', async () => {
    renderPanel([
      reviewsMock(
        [review({ images: ['https://cdn.test/a.jpg', 'https://cdn.test/b.jpg'] })],
        { average_rating: 4.5, total: 12 },
      ),
    ]);

    expect(screen.getByRole('progressbar')).toBeTruthy();

    expect(await screen.findByText('Asha')).toBeTruthy();
    expect(screen.queryByRole('progressbar')).toBeNull();
    expect(screen.getByText('4.5 · 12 reviews')).toBeTruthy();
    expect(screen.getByText('Fits perfectly')).toBeTruthy();
    expect(screen.getByText('7')).toBeTruthy();
    expect(screen.getByText('1')).toBeTruthy();
    expect(screen.getAllByAltText('Review').map((img) => img.getAttribute('src'))).toEqual([
      'https://cdn.test/a.jpg',
      'https://cdn.test/b.jpg',
    ]);
  });

  it('uses the singular noun for a single review and omits images when there are none', async () => {
    renderPanel([reviewsMock([review()], { average_rating: 5, total: 1 })]);

    expect(await screen.findByText('5 · 1 review')).toBeTruthy();
    expect(screen.queryByAltText('Review')).toBeNull();
  });

  it('hides the summary line entirely when the product has no ratings yet', async () => {
    renderPanel([reviewsMock([], { average_rating: 0, total: 0 })]);

    expect(await screen.findByText('No reviews yet for this product.')).toBeTruthy();
    expect(screen.queryByText(/·\s*\d+ review/)).toBeNull();
    expect(screen.queryByRole('button', { name: /Reply|Update/ })).toBeNull();
  });

  it('keeps the reply button disabled until the seller types something', async () => {
    renderPanel([reviewsMock([review()], { average_rating: 5, total: 1 })]);

    const button = await screen.findByRole('button', { name: 'Reply' });
    expect((button as HTMLButtonElement).disabled).toBe(true);

    fireEvent.change(screen.getByPlaceholderText('Reply to this review'), {
      target: { value: '   ' },
    });
    expect((screen.getByRole('button', { name: 'Reply' }) as HTMLButtonElement).disabled).toBe(true);

    fireEvent.change(screen.getByPlaceholderText('Reply to this review'), {
      target: { value: 'Thanks!' },
    });
    expect((screen.getByRole('button', { name: 'Reply' }) as HTMLButtonElement).disabled).toBe(false);
  });

  it('sends the trimmed reply, refetches, and relabels the button Update', async () => {
    let sent: Record<string, unknown> | null = null;
    renderPanel([
      reviewsMock([review()], { average_rating: 5, total: 1 }),
      {
        request: {
          query: REPLY_TO_REVIEW,
          variables: { review_id: 'r1', reply: 'Glad it fits' },
        },
        result: (variables) => {
          sent = variables as Record<string, unknown>;
          return {
            data: {
              replyToProductReview: {
                __typename: 'ProductReview',
                id: 'r1',
                seller_reply: 'Glad it fits',
              },
            },
          };
        },
      },
      reviewsMock([review({ seller_reply: 'Glad it fits' })], { average_rating: 5, total: 1 }),
    ]);

    fireEvent.change(await screen.findByPlaceholderText('Reply to this review'), {
      target: { value: '  Glad it fits  ' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Reply' }));

    expect(await screen.findByRole('button', { name: 'Update' })).toBeTruthy();
    expect(sent).toEqual({ review_id: 'r1', reply: 'Glad it fits' });
  });

  it('seeds the box with an existing seller reply and labels the button Update', async () => {
    renderPanel([
      reviewsMock([review({ seller_reply: 'Already answered' })], { average_rating: 5, total: 1 }),
    ]);

    const box = (await screen.findByPlaceholderText('Reply to this review')) as HTMLInputElement;
    expect(box.value).toBe('Already answered');
    expect(screen.getByRole('button', { name: 'Update' })).toBeTruthy();
  });

  it('surfaces a failed reply as an error alert without losing the typed text', async () => {
    renderPanel([
      reviewsMock([review()], { average_rating: 5, total: 1 }),
      {
        request: { query: REPLY_TO_REVIEW, variables: { review_id: 'r1', reply: 'Sorry!' } },
        error: new Error('Reply rejected by moderation'),
      },
    ]);

    fireEvent.change(await screen.findByPlaceholderText('Reply to this review'), {
      target: { value: 'Sorry!' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Reply' }));

    await waitFor(() =>
      expect(screen.getByRole('alert').textContent).toContain('Reply rejected by moderation'),
    );
    expect((screen.getByPlaceholderText('Reply to this review') as HTMLInputElement).value).toBe(
      'Sorry!',
    );
  });

  it('renders one divider between consecutive reviews', async () => {
    renderPanel([
      reviewsMock(
        [review(), review({ id: 'r2', user_name: 'Bela', comment: '' })],
        { average_rating: 4, total: 2 },
      ),
    ]);

    expect(await screen.findByText('Asha')).toBeTruthy();
    expect(screen.getByText('Bela')).toBeTruthy();
    expect(screen.getAllByRole('separator')).toHaveLength(1);
    expect(screen.queryByText('Fits perfectly')).toBeTruthy();
  });
});
