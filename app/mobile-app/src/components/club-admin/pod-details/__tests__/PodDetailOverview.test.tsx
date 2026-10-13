import { screen } from '@testing-library/react-native';

import { PodDetailOverview } from '@/components/club-admin/pod-details/PodDetailOverview';
import { renderWithProviders } from '@/utils/test-utils';

let mockProductsFlag = false;
jest.mock('@/hooks/useFeatureFlag', () => ({ useFeatureFlag: () => mockProductsFlag }));
jest.mock('@/hooks/usePublicFinance', () => ({
  usePublicFinance: () => ({ gstPct: 0, currency: 'Rs' }),
}));
jest.mock('@/hooks/useDateFormat', () => ({
  useDateFormat: () => ({ formatDateTime: (iso: string) => `at ${iso.slice(0, 10)}` }),
}));

const basePod = {
  pod_id: 'POD-100',
  pod_title: 'Sunday Jam',
  pod_description: '',
  pod_type: 'PAID',
  pod_amount: 200,
  pod_mode: 'PHYSICAL',
  pod_date_time: '2031-05-01T10:00:00.000Z',
  pod_end_date_time: null,
  created_at: '2031-04-01T08:00:00.000Z',
  no_of_spots: 10,
  seats_taken: 4,
  pod_hits: 120,
  like_count: 7,
  comment_count: 3,
  place_label: 'Cafe Jam',
  zone_name: 'Koregaon',
  meeting_platform: '',
  products_enabled: false,
  is_active: true,
  is_deleted: false,
  completed_at: null,
  venue_approval_status: 'APPROVED',
  ticket_discount_enabled: false,
  ticket_discount_tiers: [],
  attendance: { attended_seats: 3, booked_seats: 4, recorded: true },
};

const render = (over: Record<string, unknown> = {}) =>
  renderWithProviders(<PodDetailOverview pod={{ ...basePod, ...over } as never} />);

const text = (id: string) => screen.getByTestId(id);

beforeEach(() => {
  mockProductsFlag = false;
});

describe('PodDetailOverview', () => {
  it('shows the core facts of a physical paid pod', () => {
    render();
    expect(text('club-pod-detail-pod-id')).toHaveTextContent('POD-100');
    expect(text('club-pod-detail-when')).toHaveTextContent('at 2031-05-01');
    expect(text('club-pod-detail-place')).toHaveTextContent('Cafe Jam');
    expect(text('club-pod-detail-people')).toHaveTextContent('4');
    expect(text('club-pod-detail-spots-left')).toHaveTextContent('6');
    expect(text('club-pod-detail-attended')).toHaveTextContent('3 / 4');
    expect(text('club-pod-detail-views')).toHaveTextContent('120');
    expect(text('club-pod-detail-social')).toHaveTextContent('7 · 3');
    expect(text('club-pod-detail-created')).toHaveTextContent('at 2031-04-01');
    expect(text('club-pod-detail-price')).toHaveTextContent(/Rs.*200/);
    expect(screen.queryByTestId('club-pod-detail-ends')).toBeNull();
    expect(screen.queryByTestId('club-pod-detail-description')).toBeNull();
  });

  it('never shows negative spots left for an overbooked pod', () => {
    render({ seats_taken: 12 });
    expect(text('club-pod-detail-spots-left')).toHaveTextContent('0');
  });

  it('reads an unrecorded attendance as not recorded rather than zero', () => {
    render({ attendance: { attended_seats: 0, booked_seats: 4, recorded: false } });
    expect(text('club-pod-detail-attended')).not.toHaveTextContent('0 / 4');
  });

  it('shows the end time and description when the pod has them', () => {
    render({
      pod_end_date_time: '2031-05-01T12:00:00.000Z',
      pod_description: 'Bring an instrument',
    });
    expect(text('club-pod-detail-ends')).toHaveTextContent('at 2031-05-01');
    expect(text('club-pod-detail-description')).toHaveTextContent('Bring an instrument');
  });

  it('shows a free pod as free and offers no ticket discount', () => {
    render({
      pod_type: 'FREE',
      pod_amount: 0,
      ticket_discount_enabled: true,
      ticket_discount_tiers: [{ min_tickets: 3, discount_pct: 10 }],
    });
    expect(text('club-pod-detail-price')).not.toHaveTextContent(/Rs/);
    expect(screen.queryByTestId('club-pod-detail-ticket-offer')).toBeNull();
  });

  it('lists each live ticket tier, dropping the implied single-ticket row', () => {
    render({
      ticket_discount_enabled: true,
      ticket_discount_tiers: [
        { min_tickets: 3, discount_pct: 10 },
        { min_tickets: 5, discount_pct: 20 },
      ],
    });
    const offer = text('club-pod-detail-ticket-offer');
    expect(offer).toHaveTextContent(/3/);
    expect(offer).toHaveTextContent(/20/);
    expect(offer.props.children).toEqual(expect.stringContaining('\n'));
  });

  it('omits the offer when discounts are on but no tier exists', () => {
    render({ ticket_discount_enabled: true, ticket_discount_tiers: [] });
    expect(screen.queryByTestId('club-pod-detail-ticket-offer')).toBeNull();
  });

  it('shows a virtual pod with its meeting platform, or Online when none is set', () => {
    const first = render({ pod_mode: 'VIRTUAL', meeting_platform: 'Google Meet' });
    expect(text('club-pod-detail-place')).toHaveTextContent('Google Meet');
    first.unmount();
    render({ pod_mode: 'VIRTUAL', meeting_platform: '' });
    expect(text('club-pod-detail-place')).not.toHaveTextContent('Cafe Jam');
  });

  it('falls back to the zone, and drops the place row when there is neither', () => {
    const first = render({ place_label: '' });
    expect(text('club-pod-detail-place')).toHaveTextContent('Koregaon');
    first.unmount();
    render({ place_label: '', zone_name: '' });
    expect(screen.queryByTestId('club-pod-detail-place')).toBeNull();
  });

  it('shows the products row only when the products feature is on', () => {
    const off = render({ products_enabled: true });
    expect(screen.queryByTestId('club-pod-detail-products')).toBeNull();
    off.unmount();

    mockProductsFlag = true;
    const on = render({ products_enabled: true });
    const enabledText = text('club-pod-detail-products').props.children;
    on.unmount();
    render({ products_enabled: false });
    expect(text('club-pod-detail-products').props.children).not.toBe(enabledText);
  });

  it('names the status from the shared rules', () => {
    const active = render();
    const activeLabel = text('club-pod-detail-status').props.children;
    active.unmount();
    render({ is_deleted: true });
    expect(text('club-pod-detail-status').props.children).not.toBe(activeLabel);
  });
});
