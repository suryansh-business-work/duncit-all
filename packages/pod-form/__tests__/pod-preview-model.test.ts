/**
 * The live preview's derivation.
 *
 * It is pure on purpose: the portals render what a pod will look like straight
 * from the form values plus the lookup lists the form already holds, with no
 * network round-trip, so the preview cannot lag behind what is being typed.
 * That means every rule about what a reader sees — free vs priced, virtual vs
 * physical, which of the lookups a name comes from — is decided here.
 */
import { describe, expect, it } from 'vitest';

import { buildPodPreview } from '../src/preview/pod-preview-model';
import { blankPodFormValues, type PodFormData, type PodFormValues } from '../src/types';

const values = (over: Partial<PodFormValues> = {}): PodFormValues => ({
  ...blankPodFormValues,
  pod_title: 'Sunday Badminton',
  pod_description: 'Doubles at Court 2.',
  no_of_spots: 8,
  pod_amount: 250,
  pod_type: 'NATIVE_PAID',
  ...over,
});

const data = (over: Partial<PodFormData> = {}): PodFormData =>
  ({
    config: {},
    clubs: [{ id: 'club-1', club_name: 'Sunset Club' }],
    venues: [{ id: 'venue-1', venue_name: 'Indiranagar Courts' }],
    users: [
      { user_id: 'u-1', full_name: 'Asha Rao' },
      { user_id: 'u-2', full_name: 'Vikram S' },
    ],
    products: [],
    finance: { currency_symbol: '₹' },
    getClubVenueIds: () => ['venue-1'],
    dateFormatter: {
      formatDateTime: (input: unknown) => `dt:${String(input)}`,
      formatDate: (input: unknown) => `d:${String(input)}`,
      formatTime: (input: unknown) => `t:${String(input)}`,
    },
    ...over,
  }) as unknown as PodFormData;

describe('buildPodPreview', () => {
  it('shows the title a host typed', () => {
    expect(buildPodPreview(values(), data()).title).toBe('Sunday Badminton');
  });

  it('never shows a blank heading — an untitled pod says so', () => {
    expect(buildPodPreview(values({ pod_title: '   ' }), data()).title).toBe('Untitled pod');
  });

  it('reads a virtual pod’s place from its meeting platform', () => {
    const model = buildPodPreview(
      values({ pod_mode: 'VIRTUAL', meeting_platform: 'Google Meet' }),
      data()
    );

    expect(model.isVirtual).toBe(true);
    expect(model.modeText).toBe('Virtual');
    expect(model.placeText).toBe('Google Meet');
  });

  it('names a generic online meeting when the platform has not been picked yet', () => {
    expect(buildPodPreview(values({ pod_mode: 'VIRTUAL' }), data()).placeText).toBe('Online meeting');
  });

  it('reads a physical pod’s place from the venue list the form already holds', () => {
    const model = buildPodPreview(values({ pod_mode: 'PHYSICAL', venue_id: 'venue-1' }), data());

    expect(model.isVirtual).toBe(false);
    expect(model.modeText).toBe('Physical');
    expect(model.placeText).toContain('Indiranagar');
  });

  it('names the club and the hosts from the same lookups', () => {
    const model = buildPodPreview(values({ club_id: 'club-1', pod_hosts_id: ['u-1', 'u-2'] }), data());

    expect(model.clubName).toContain('Sunset Club');
    expect(model.hostNames).toHaveLength(2);
  });

  it('prices a paid pod in the configured currency', () => {
    expect(buildPodPreview(values({ pod_amount: 250 }), data()).priceText).toContain('250');
  });

  it('says free rather than a zero price when the pod type is free', () => {
    const model = buildPodPreview(values({ pod_type: 'NATIVE_FREE', pod_amount: 0 }), data());

    expect(model.isFree).toBe(true);
    expect(model.priceText.toLowerCase()).toContain('free');
  });

  it('counts the spots, and survives a field that is still empty text', () => {
    expect(buildPodPreview(values({ no_of_spots: 8 }), data()).spotsTotal).toBe(8);
    expect(buildPodPreview(values({ no_of_spots: '' as unknown as number }), data()).spotsTotal).toBe(0);
  });

  it('formats the window through the admin-configured formatter, never its own', () => {
    const model = buildPodPreview(
      values({ pod_date_time: new Date('2026-08-30T12:30:00.000Z'), pod_end_date_time: null }),
      data()
    );

    expect(model.whenText).toContain('d:');
    expect(model.whenText).toContain('t:');
  });

  it('trims the copy so trailing whitespace is not previewed as content', () => {
    const model = buildPodPreview(values({ pod_description: '  Doubles.  ', pod_info: '  Bring a racquet.  ' }), data());

    expect(model.description).toBe('Doubles.');
    expect(model.info).toBe('Bring a racquet.');
  });

  it('drops the empty rows a repeatable field leaves behind', () => {
    const model = buildPodPreview(
      values({
        what_this_pod_offers: ['Shuttles', ''],
        available_perks: ['', 'Parking'],
        place_charges: [
          { label: 'Court', amount: 200 },
          { label: '   ', amount: 0 },
        ] as PodFormValues['place_charges'],
      }),
      data()
    );

    expect(model.offers).toEqual(['Shuttles']);
    expect(model.perks).toEqual(['Parking']);
    expect(model.charges).toHaveLength(1);
  });

  it('reads the media field as one URL per line', () => {
    const model = buildPodPreview(
      values({ media_text: 'https://cdn.duncit.com/a.jpg\n\n https://cdn.duncit.com/b.mp4 ' }),
      data()
    );

    expect(model.media).toHaveLength(2);
  });

  it('previews a pod that has barely been started', () => {
    const model = buildPodPreview(blankPodFormValues, data());

    // A brand-new pod starts on the free type, so it must not read as priced.
    expect(model.isFree).toBe(true);

    expect(model.title).toBe('Untitled pod');
    expect(model.media).toEqual([]);
    expect(model.offers).toEqual([]);
  });
});

describe('buildPodPreview - the edges the card renders around', () => {
  it('extends the when-line through the end time when one is set', () => {
    const start = new Date('2030-06-01T10:00:00.000Z');
    const end = new Date('2030-06-01T12:00:00.000Z');
    const model = buildPodPreview(values({ pod_date_time: start, pod_end_date_time: end }), data());
    // start day + start time, then the end time after the dash
    expect(model.whenText).toBe(`d:${String(start)} · t:${String(start)} – t:${String(end)}`);
  });

  it('stops the when-line at the start when no end is set', () => {
    const start = new Date('2030-06-01T10:00:00.000Z');
    const model = buildPodPreview(values({ pod_date_time: start, pod_end_date_time: null }), data());
    expect(model.whenText).toBe(`d:${String(start)} · t:${String(start)}`);
  });

  it('falls back to a host email when the profile carries no name', () => {
    const model = buildPodPreview(
      values({ pod_hosts_id: ['u-3', 'u-4', 'u-missing'] }),
      data({
        users: [
          { user_id: 'u-3', email: 'host@duncit.com' },
          { user_id: 'u-4', full_name: '', email: '' },
        ],
      }),
    );
    // No name -> email; nothing at all -> the host is left out, never a blank line.
    expect(model.hostNames).toEqual(['host@duncit.com']);
  });

  it('prices in rupees when no currency symbol is configured', () => {
    const model = buildPodPreview(values({ pod_amount: 250 }), data({ finance: undefined }));
    expect(model.priceText).toBe('₹250');
  });

  // Step 1 of a paid pod is reached with the amount box still empty, and the
  // preview renders alongside it — a blank box must price at zero, not NaN.
  it('prices a paid pod at zero while the amount box is still empty', () => {
    const empty = buildPodPreview(
      values({ pod_amount: '' as unknown as number }),
      data(),
    );
    expect(empty.priceText).toBe('₹0');
  });
});

describe('buildPodPreview - the multi-ticket offer', () => {
  const discounted = (over: Partial<PodFormValues> = {}) =>
    values({
      pod_amount: 250,
      ticket_discount_enabled: true,
      ticket_discount_tiers: [
        { min_tickets: 2, discount_pct: 10 },
        { min_tickets: 4, discount_pct: 20 },
      ],
      ...over,
    });

  it('lists each tier with what one ticket then costs, leaving the base row out', () => {
    expect(buildPodPreview(discounted(), data()).ticketDiscountTiers).toEqual([
      { min_tickets: 2, discount_pct: 10, per_ticket: 225 },
      { min_tickets: 4, discount_pct: 20, per_ticket: 200 },
    ]);
  });

  // A row that does not ask for more tickets than the one above is still being
  // typed — the form flags it; the preview does not list a tier twice.
  it('skips a tier that does not ask for more tickets than the row above', () => {
    const model = buildPodPreview(
      discounted({
        ticket_discount_tiers: [
          { min_tickets: 3, discount_pct: 10 },
          { min_tickets: 3, discount_pct: 15 },
          { min_tickets: 5, discount_pct: 20 },
        ],
      }),
      data(),
    );

    expect(model.ticketDiscountTiers.map((tier) => tier.min_tickets)).toEqual([3, 5]);
  });

  it('offers nothing while the discount is switched off', () => {
    expect(buildPodPreview(discounted({ ticket_discount_enabled: false }), data()).ticketDiscountTiers).toEqual([]);
  });

  it('offers nothing on a free pod, whatever tiers the hidden section still holds', () => {
    const model = buildPodPreview(discounted({ pod_type: 'NATIVE_FREE', pod_amount: 0 }), data());

    expect(model.ticketDiscountTiers).toEqual([]);
  });
});
