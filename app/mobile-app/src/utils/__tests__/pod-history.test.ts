import {
  activePodHistoryFilterCount,
  applyPodHistory,
  canRejoin,
  categoriesUnder,
  dedupeByPod,
  DEFAULT_POD_HISTORY_FILTERS,
  podHistoryGate,
  podPriceCaption,
  refundLabel,
  REFUND_LABEL,
  superCategories,
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
      pod_type: 'PAID',
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
    expect(podPriceCaption('FREE', 0)).toBe('Free pod');
  });

  it('labels paid pods with the amount', () => {
    expect(podPriceCaption('PAID', 500)).toBe('Paid pod ₹500');
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

describe('podHistoryGate', () => {
  const future = '2999-01-01T10:00:00Z';
  const past = '2020-01-01T10:00:00Z';
  const onPod = (date: string, participation: Record<string, unknown> = {}) =>
    membership({
      pod: { ...membership().pod!, pod_date_time: date },
      participation: {
        joined_at: '2026-06-01T10:00:00Z',
        attended: false,
        attendance_recorded: false,
        pod_cancelled_by: null,
        pod_cancelled_at: null,
        cancel_refund_status: 'NONE',
        backouts: [],
        ...participation,
      },
    });

  it('offers a backout and calls it Joined while the pod is still ahead', () => {
    expect(podHistoryGate(onPod(future))).toEqual({
      canBackout: true,
      showRefundState: false,
      refundStatus: 'NONE',
      joinedLabelKind: 'JOINED',
    });
  });

  it('offers nothing and calls it Visited once the pod has happened', () => {
    expect(podHistoryGate(onPod(past))).toEqual({
      canBackout: false,
      showRefundState: false,
      refundStatus: 'NONE',
      joinedLabelKind: 'VISITED',
    });
  });

  it('reports the refund state of the request that earned it', () => {
    const gate = podHistoryGate(
      onPod(future, {
        backouts: [
          {
            backout_no: 'DUN-BKO-1',
            status: 'SPOT_FILLED',
            attempt_no: 1,
            seats: 1,
            seats_before: 1,
            refund_amount: 500,
            refund_status: 'PROCESSED',
            deduction_pct: 10,
            refund_processed_at: '2026-06-06',
            created_at: '2026-06-05',
            events: [],
          },
        ],
      }),
    );
    expect(gate.showRefundState).toBe(true);
    expect(gate.refundStatus).toBe('PROCESSED');
  });

  it('reports nothing for a request the member cancelled with Keep My Spot', () => {
    const gate = podHistoryGate(
      onPod(future, {
        backouts: [
          {
            backout_no: 'DUN-BKO-2',
            status: 'CANCELLED',
            attempt_no: 1,
            seats: 1,
            seats_before: 1,
            refund_amount: null,
            refund_status: 'NONE',
            deduction_pct: 10,
            refund_processed_at: null,
            created_at: '2026-06-05',
            events: [],
          },
        ],
      }),
    );
    expect(gate.showRefundState).toBe(false);
  });
});

describe('canRejoin', () => {
  const activePod = {
    ...membership().pod!,
    pod_date_time: '2999-01-01T10:00:00Z',
    pod_end_date_time: null,
  };

  it('allows rejoin for an active backed-out booking', () => {
    expect(canRejoin(membership({ status: 'BACKED_OUT', pod: activePod }))).toBe(true);
  });

  it('blocks rejoin for a joined booking', () => {
    expect(canRejoin(membership({ pod: activePod }))).toBe(false);
  });

  it('blocks rejoin for a deleted pod', () => {
    expect(
      canRejoin(membership({ status: 'BACKED_OUT', pod: { ...activePod, is_deleted: true } })),
    ).toBe(false);
  });

  it('blocks rejoin when the pod is missing', () => {
    expect(canRejoin(membership({ status: 'BACKED_OUT', pod: null }))).toBe(false);
  });

  it('blocks rejoin once the pod has ended', () => {
    expect(
      canRejoin(
        membership({
          status: 'BACKED_OUT',
          pod: { ...activePod, pod_date_time: '2000-01-01T10:00:00Z' },
        }),
      ),
    ).toBe(false);
  });
});

describe('pod history filter + sort', () => {
  const withClub = (
    id: string,
    superId: string,
    categoryId: string,
    amount: number,
    date: string,
  ) =>
    membership({
      id,
      pod: {
        id: `pod-${id}`,
        pod_title: `Pod ${id}`,
        pod_date_time: date,
        pod_amount: amount,
        club: { id: `club-${id}`, super_category_id: superId, category_id: categoryId },
      },
    });

  const a = withClub('a', 's1', 'c1', 300, '2026-06-05T10:00:00Z');
  const b = withClub('b', 's1', 'c2', 100, '2026-06-02T10:00:00Z');
  const c = withClub('c', 's2', 'c3', 200, '2026-06-09T10:00:00Z');
  const all = [a, b, c];
  const ids = (items: PodMembership[]) => items.map((i) => i.id);

  it('keeps everything and sorts newest-first by default', () => {
    expect(ids(applyPodHistory(all, DEFAULT_POD_HISTORY_FILTERS))).toEqual(['c', 'a', 'b']);
  });

  it('sorts oldest-first, then by price low→high and high→low', () => {
    expect(ids(applyPodHistory(all, { ...DEFAULT_POD_HISTORY_FILTERS, sort: 'DATE_ASC' }))).toEqual(
      ['b', 'a', 'c'],
    );
    expect(
      ids(applyPodHistory(all, { ...DEFAULT_POD_HISTORY_FILTERS, sort: 'PRICE_ASC' })),
    ).toEqual(['b', 'c', 'a']);
    expect(
      ids(applyPodHistory(all, { ...DEFAULT_POD_HISTORY_FILTERS, sort: 'PRICE_DESC' })),
    ).toEqual(['a', 'c', 'b']);
  });

  it('filters by super category, then refines by category', () => {
    expect(
      ids(applyPodHistory(all, { search: '', superId: 's1', categoryId: '', sort: 'DATE_DESC' })),
    ).toEqual(['a', 'b']);
    expect(
      ids(applyPodHistory(all, { search: '', superId: 's1', categoryId: 'c2', sort: 'DATE_DESC' })),
    ).toEqual(['b']);
  });

  it('matches SUB-tagged clubs when their parent CATEGORY is selected (the fix)', () => {
    const cats = [
      { id: 's1', name: 'For You', level: 'SUPER', parent_id: null },
      { id: 'cat1', name: 'Sports', level: 'CATEGORY', parent_id: 's1' },
      { id: 'sub1', name: 'Football', level: 'SUB', parent_id: 'cat1' },
      { id: 'sub2', name: 'Tennis', level: 'SUB', parent_id: 'cat1' },
    ] as never;
    // Clubs are tagged at the SUB level (category_id = sub*).
    const football = withClub('f', 's1', 'sub1', 100, '2026-06-05T10:00:00Z');
    const tennis = withClub('t', 's1', 'sub2', 100, '2026-06-04T10:00:00Z');
    const list = [football, tennis];
    // Selecting the parent CATEGORY keeps both SUB-tagged clubs (flat equality dropped them).
    expect(
      ids(
        applyPodHistory(
          list,
          { search: '', superId: 's1', categoryId: 'cat1', sort: 'DATE_DESC' },
          cats,
        ),
      ),
    ).toEqual(['f', 't']);
    // Selecting a specific SUB narrows to that one.
    expect(
      ids(
        applyPodHistory(
          list,
          { search: '', superId: 's1', categoryId: 'sub1', sort: 'DATE_DESC' },
          cats,
        ),
      ),
    ).toEqual(['f']);
  });

  it('drops items without a matching club (incl. missing club)', () => {
    const noClub = membership({ id: 'x', pod: { id: 'pod-x', pod_title: 'X' } });
    const items = applyPodHistory([a, noClub], {
      search: '',
      superId: 's1',
      categoryId: '',
      sort: 'DATE_DESC',
    });
    expect(ids(items)).toEqual(['a']);
  });

  it('derives super options and cascading category options', () => {
    const cats = [
      { id: 's1', name: 'For You', level: 'SUPER', parent_id: null },
      { id: 's2', name: 'For Your Pet', level: 'SUPER', parent_id: null },
      { id: 'c1', name: 'Sports', level: 'CATEGORY', parent_id: 's1' },
      { id: 'c2', name: 'Yoga', level: 'CATEGORY', parent_id: 's2' },
    ] as never;
    expect(superCategories(cats).map((c) => c.id)).toEqual(['s1', 's2']);
    expect(categoriesUnder(cats, 's1').map((c) => c.id)).toEqual(['c1']);
    expect(categoriesUnder(cats, '')).toEqual([]);
  });

  it('counts the active filters', () => {
    expect(activePodHistoryFilterCount(DEFAULT_POD_HISTORY_FILTERS)).toBe(0);
    expect(
      activePodHistoryFilterCount({
        search: '',
        superId: 's1',
        categoryId: 'c1',
        sort: 'DATE_DESC',
      }),
    ).toBe(2);
  });

  it('treats a pod-less membership as zero date/price across every sort', () => {
    const z = membership({ id: 'z', pod: null });
    const list = [a, z, b];
    expect(
      ids(applyPodHistory(list, { ...DEFAULT_POD_HISTORY_FILTERS, sort: 'DATE_DESC' })),
    ).toEqual(['a', 'b', 'z']);
    expect(
      ids(applyPodHistory(list, { ...DEFAULT_POD_HISTORY_FILTERS, sort: 'DATE_ASC' })),
    ).toEqual(['z', 'b', 'a']);
    expect(
      ids(applyPodHistory(list, { ...DEFAULT_POD_HISTORY_FILTERS, sort: 'PRICE_ASC' })),
    ).toEqual(['z', 'b', 'a']);
    expect(
      ids(applyPodHistory(list, { ...DEFAULT_POD_HISTORY_FILTERS, sort: 'PRICE_DESC' })),
    ).toEqual(['a', 'b', 'z']);
  });
});
