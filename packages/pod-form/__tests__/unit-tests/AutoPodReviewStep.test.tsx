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
const PLATFORMS = [{ value: 'GOOGLE_MEET', label: 'Google Meet' }];

const filled: Partial<PodFormValues> = {
  super_category_id: 'sup-sports',
  sub_category_id: 'sub-badminton',
  pod_title: '  Sunday Doubles  ',
  pod_type: 'PAID',
  pod_amount: 500,
  no_of_spots: 8,
  pod_occurrence: 'WEEKLY',
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
  it('reads every field of a physical template back, read-only', () => {
    renderReview(filled, { finance: { platform_fee_pct: 5, gst_pct: 18, currency_symbol: '₹' } });
    expect(screen.getByRole('alert')).toHaveTextContent('Read it through once more.');
    expect(screen.getByText('Sports › Racket › Badminton')).toBeInTheDocument();
    expect(screen.getByText('Physical')).toBeInTheDocument();
    expect(screen.getByText('Sunday Doubles')).toBeInTheDocument();
    expect(screen.getByText(/₹\s?500/)).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
    expect(screen.getByText('Weekly')).toBeInTheDocument();
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
    // A physical template has no meeting rows.
    expect(screen.queryByText('Meeting link')).not.toBeInTheDocument();
  });

  it('adds the meeting window and details of a virtual template, and drops the products', () => {
    renderReview(
      {
        ...filled,
        pod_mode: 'VIRTUAL',
        meeting_platform: 'GOOGLE_MEET',
        meeting_url: 'https://meet.google.com/abc',
        meeting_notes: '',
        pod_date_time: new Date(Date.UTC(2030, 0, 5, 10, 0, 0)),
        pod_end_date_time: new Date(Date.UTC(2030, 0, 5, 11, 30, 0)),
      },
      { meetingPlatforms: PLATFORMS },
    );
    expect(screen.getByText('Virtual')).toBeInTheDocument();
    expect(screen.getByText('2030-01-05 · 10:00 – 2030-01-05 · 11:30')).toBeInTheDocument();
    // The platform's label, not its stored value.
    expect(screen.getByText('Google Meet')).toBeInTheDocument();
    expect(screen.getByText('https://meet.google.com/abc')).toBeInTheDocument();
    expect(screen.queryByText('Approved products')).not.toBeInTheDocument();
    expect(screen.queryByText('Rackets × 2')).not.toBeInTheDocument();
  });

  it('shows the raw platform when it is not in the menu, and a start without an end on its own', () => {
    renderReview({
      ...filled,
      pod_mode: 'VIRTUAL',
      meeting_platform: 'Jitsi',
      pod_date_time: new Date(Date.UTC(2030, 0, 5, 10, 0, 0)),
      pod_end_date_time: null,
    });
    expect(screen.getByText('Jitsi')).toBeInTheDocument();
    expect(screen.getByText('2030-01-05 · 10:00')).toBeInTheDocument();
  });

  it('draws a dash for everything not written yet, and echoes a value no menu knows', () => {
    renderReview({
      pod_type: 'PAID',
      pod_amount: 0,
      no_of_spots: 0,
      pod_mode: 'VIRTUAL',
      pod_occurrence: 'CUSTOM',
      pod_hashtag_text: '',
    });
    // Category, title, when, platform, link, notes, description, info, hashtags,
    // offers, perks, reel — every empty row reads the same.
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(12);
    expect(screen.getByText('CUSTOM')).toBeInTheDocument();
    expect(screen.getByText('0 file(s)')).toBeInTheDocument();
  });
});
