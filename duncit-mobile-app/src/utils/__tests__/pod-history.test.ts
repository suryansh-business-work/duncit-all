import {
  buildTimeline,
  dedupeByPod,
  podPriceCaption,
  refundLabel,
  REFUND_LABEL,
  type PodMembership,
  type RefundStatus,
} from '@/utils/pod-history';

const rs = (s: string) => s as RefundStatus;

const membership = (over: Record<string, unknown> = {}): PodMembership =>
  ({
    id: 'm1',
    pod_id: 'p1',
    status: 'JOINED',
    joined_at: '2026-06-01T10:00:00Z',
    backed_out_at: null,
    payment_id: 'pay1',
    refund_status: 'NONE',
    refund_payment_id: null,
    referral_token: null,
    source: 'DIRECT',
    pod: {
      id: 'pod1',
      pod_id: 'p1',
      club_slug: 'club',
      pod_title: 'Sunset Pod',
      pod_date_time: '2026-06-10T10:00:00Z',
      pod_end_date_time: null,
      pod_amount: 500,
      pod_type: 'NATIVE_PAID',
      no_of_spots: 4,
      pod_images_and_videos: [],
    },
    ...over,
  }) as unknown as PodMembership;

describe('refundLabel', () => {
  it('maps every known status', () => {
    expect(refundLabel(rs('NONE'))).toBe('Not started');
    expect(refundLabel(rs('PENDING'))).toBe('Criteria pending');
    expect(refundLabel(rs('PROCESSED'))).toBe('Refund initiated');
    expect(refundLabel(rs('NOT_ELIGIBLE'))).toBe('Not initiated');
  });

  it('falls back to the NONE label for an unknown status', () => {
    expect(refundLabel(rs('WEIRD'))).toBe(REFUND_LABEL.NONE);
  });
});

describe('podPriceCaption', () => {
  it('labels free pods', () => {
    expect(podPriceCaption('NATIVE_FREE', 0)).toBe('Free pod');
  });

  it('labels paid pods with the amount', () => {
    expect(podPriceCaption('NATIVE_PAID', 500)).toBe('Paid pod ₹500');
  });

  it('defaults the amount to 0 and treats null type as paid', () => {
    expect(podPriceCaption(null, null)).toBe('Paid pod ₹0');
  });
});

describe('dedupeByPod', () => {
  it('keeps the first membership per pod', () => {
    const items = [
      membership({ id: 'a', pod: { ...membership().pod!, id: 'podX' } }),
      membership({ id: 'b', pod: { ...membership().pod!, id: 'podX' } }),
      membership({ id: 'c', pod: { ...membership().pod!, id: 'podY' } }),
    ];
    expect(dedupeByPod(items).map((m) => m.id)).toEqual(['a', 'c']);
  });

  it('falls back to pod_id then membership id when pod is missing', () => {
    const items = [
      membership({ id: 'a', pod: null, pod_id: 'pp' }),
      membership({ id: 'b', pod: null, pod_id: 'pp' }),
      membership({ id: 'c', pod: null, pod_id: null }),
    ];
    expect(dedupeByPod(items).map((m) => m.id)).toEqual(['a', 'c']);
  });
});

describe('buildTimeline', () => {
  it('returns join + available backout for a joined membership', () => {
    const events = buildTimeline(membership());
    expect(events.map((e) => e.title)).toEqual(['Pod Joined', 'Backout requested']);
    expect(events[1]?.tag).toBe('Available');
  });

  it('marks refund as processed when backed out + PROCESSED', () => {
    const events = buildTimeline(
      membership({ status: 'BACKED_OUT', backed_out_at: '2026-06-05', refund_status: 'PROCESSED' }),
    );
    expect(events).toHaveLength(4);
    expect(events[2]?.tag).toBe('Checked');
    expect(events[3]?.title).toBe('Refund initiated');
    expect(events[3]?.state).toBe('done');
  });

  it('marks refund pending (current) when backed out + PENDING', () => {
    const events = buildTimeline(
      membership({ status: 'BACKED_OUT', backed_out_at: '2026-06-05', refund_status: 'PENDING' }),
    );
    expect(events[2]?.tag).toBe('Waiting');
    expect(events[2]?.state).toBe('current');
    expect(events[3]?.title).toBe('Refund not initiated');
  });

  it('marks refund not initiated when backed out + NOT_ELIGIBLE', () => {
    const events = buildTimeline(
      membership({
        status: 'BACKED_OUT',
        backed_out_at: '2026-06-05',
        refund_status: 'NOT_ELIGIBLE',
      }),
    );
    expect(events[2]?.tag).toBe('Checked');
    expect(events[3]?.title).toBe('Refund not initiated');
    expect(events[3]?.state).toBe('current');
  });
});
