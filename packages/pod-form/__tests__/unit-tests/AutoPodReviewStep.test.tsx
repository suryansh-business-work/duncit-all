import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import AutoPodReviewStep from '../../src/auto-pod/AutoPodReviewStep';
import { Harness, makeConfig, makeData } from './helpers';
import type { PodFormData, PodFormValues } from '../../src/types';

// The review names the category off the admin category tree, read through useQuery.
const CATEGORIES = [
  { id: 'sup-sports', name: 'Sports', slug: 'sports', level: 'SUPER', parent_id: null },
  { id: 'cat-racket', name: 'Racket', slug: 'racket', level: 'CATEGORY', parent_id: 'sup-sports' },
  { id: 'sub-badminton', name: 'Badminton', slug: 'bad', level: 'SUB', parent_id: 'cat-racket' },
];
vi.mock('@apollo/client', () => ({
  gql: (s: TemplateStringsArray) => s.join(''),
}));
vi.mock('@apollo/client/react', () => ({
  useQuery: () => ({ data: { categories: CATEGORIES }, loading: false, error: undefined }),
}));

const PRODUCTS = [{ id: 'p1', product_name: 'Rackets', unit_cost: 450 }];

const filled: Partial<PodFormValues> = {
  super_category_id: 'sup-sports',
  sub_category_id: 'sub-badminton',
  pod_title: '  Sunday Doubles  ',
  pod_type: 'PAID',
  pod_description: 'Friendly doubles.',
  pod_info: 'Bring shoes.',
  pod_hashtag_text: '#badminton, weekend',
  what_this_pod_offers: ['Coaching'],
  available_perks: ['Water'],
  product_requests: [
    { product_id: 'p1', quantity: 2 },
    { product_id: 'gone', quantity: 1 },
  ],
  media_text: 'https://cdn.example.com/a.jpg\nhttps://cdn.example.com/b.mp4',
  reel_url: 'https://cdn.example.com/reel.mp4',
};

function renderReview(defaults: Partial<PodFormValues>, data: Partial<PodFormData> = {}) {
  render(
    <Harness
      data={makeData({ config: makeConfig({ autoPod: true, showProducts: true }), products: PRODUCTS, ...data })}
      defaultValues={defaults}
    >
      <AutoPodReviewStep />
    </Harness>,
  );
}

describe('AutoPodReviewStep', () => {
  // The template is the pod's CONTENT: no price, spots, occurrence or meeting
  // rows, because the host brings all of those when they assign themselves.
  it('reads every field of a physical template back, read-only', () => {
    renderReview(filled, { finance: { platform_fee_pct: 5, gst_pct: 18, currency_symbol: '₹' } });
    expect(screen.getByRole('alert')).toHaveTextContent('Read it through once more.');
    expect(screen.getByText('Sports › Racket › Badminton')).toBeInTheDocument();
    expect(screen.getByText('Physical')).toBeInTheDocument();
    expect(screen.getByText('Sunday Doubles')).toBeInTheDocument();
    expect(screen.getByText('Friendly doubles.')).toBeInTheDocument();
    expect(screen.getByText('Bring shoes.')).toBeInTheDocument();
    expect(screen.getByText('badminton')).toBeInTheDocument();
    expect(screen.getByText('weekend')).toBeInTheDocument();
    expect(screen.getByText('Coaching')).toBeInTheDocument();
    expect(screen.getByText('Water')).toBeInTheDocument();
    // A product still in the catalogue is named; one that is not falls back to its id.
    expect(screen.getByText('Rackets × 2')).toBeInTheDocument();
    expect(screen.getByText('gone × 1')).toBeInTheDocument();
    expect(screen.getByText('2 file(s)')).toBeInTheDocument();
    expect(screen.getByText('https://cdn.example.com/reel.mp4')).toBeInTheDocument();
    // None of these belong to a template any more.
    expect(screen.queryByText('Ticket price')).not.toBeInTheDocument();
    expect(screen.queryByText('Spots')).not.toBeInTheDocument();
    expect(screen.queryByText('Occurrence')).not.toBeInTheDocument();
    expect(screen.queryByText('Meeting link')).not.toBeInTheDocument();
  });

  it('names a virtual template as such, and drops the products it could not hand out', () => {
    renderReview({ ...filled, pod_mode: 'VIRTUAL' });
    expect(screen.getByText('Virtual')).toBeInTheDocument();
    expect(screen.queryByText('Approved products')).not.toBeInTheDocument();
    expect(screen.queryByText('Rackets × 2')).not.toBeInTheDocument();
    // Still the host's to bring, on a virtual offer above all.
    expect(screen.queryByText('When')).not.toBeInTheDocument();
    expect(screen.queryByText('Meeting platform')).not.toBeInTheDocument();
  });

  it('draws a dash for everything not written yet', () => {
    renderReview({
      pod_type: 'PAID',
      pod_mode: 'VIRTUAL',
      pod_hashtag_text: '',
    });
    // Category, title, description, info, hashtags, offers, perks, reel — every
    // empty row reads the same.
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(8);
    expect(screen.getByText('0 file(s)')).toBeInTheDocument();
  });
});
