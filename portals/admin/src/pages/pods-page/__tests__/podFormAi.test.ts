/**
 * Merging an AI fill into the pod form.
 *
 * The copy a model writes is only half a pod. Club, venue, host and the slot
 * that sets the date and time are IDs it cannot invent, and leaving them out is
 * what made a filled form still fail to save — so they are resolved here
 * against the very lists the pickers render. Everything this returns has to be
 * something the form can display and the server will accept, and each rule
 * below is one way that used to fail:
 *
 *  - a value outside POD_TYPES / OCCURRENCES / the platform list has no
 *    MenuItem to match, so the Select renders BLANK. What the admin already had
 *    is kept instead.
 *  - a club with no linked venue cannot save a physical pod, so it loses to a
 *    club that has one — but a club the admin already chose is never
 *    overwritten, because that is a real decision.
 *  - a venue whose calendar is empty gets NO date at all. An invented one would
 *    silence the form's "pick an available slot" and save a physical pod that
 *    never booked the space it claims.
 *  - spots stay inside the booked capacity, because the slider caps the DISPLAY
 *    at it and a larger number would be saved without the admin ever seeing it.
 */
import type { PodFormValues } from '@duncit/pod-form';
import { describe, expect, it, vi } from 'vitest';

import { buildAiFilledPod, type AvailableSlot, type PodFillLookups } from '../podFormAi';

const prev = (over: Partial<PodFormValues> = {}): PodFormValues => ({
  pod_title: '',
  club_id: '',
  pod_mode: 'PHYSICAL',
  venue_id: '',
  venue_slot_id: '',
  location_id: '',
  zone_name: '',
  meeting_platform: '',
  meeting_url: '',
  meeting_notes: '',
  pod_hosts_id: [],
  pod_description: '',
  pod_date_time: null,
  pod_end_date_time: null,
  pod_type: 'NATIVE_PAID',
  pod_amount: 0,
  pod_occurrence: 'ONE_TIME',
  no_of_spots: 8,
  pod_info: '',
  pod_hashtag_text: '',
  media_text: '',
  reel_url: '',
  payment_terms: '',
  what_this_pod_offers: [],
  available_perks: [],
  place_charges: [],
  products_enabled: false,
  product_requests: [],
  is_active: true,
  ...over,
});

const CLUB_WITH_VENUE = { id: 'club-1', club_name: 'Sunset Club' };
const CLUB_WITHOUT = { id: 'club-2', club_name: 'Orphan Club' };
const VENUE = { id: 'venue-1', venue_name: 'Court 2' };

const lookups = (over: Partial<PodFillLookups> = {}): PodFillLookups => ({
  clubs: [CLUB_WITHOUT, CLUB_WITH_VENUE],
  venues: [VENUE],
  hosts: [{ user_id: 'host-1', full_name: 'Meera N' }],
  clubVenueIds: (club: any) => (club?.id === 'club-1' ? ['venue-1'] : []),
  slotDrivenDates: true,
  ...over,
});

const slot = (over: Partial<AvailableSlot> = {}): AvailableSlot => ({
  id: 'slot-1',
  start_at: '2026-09-02T10:00:00.000Z',
  end_at: '2026-09-02T12:00:00.000Z',
  capacity: 6,
  ...over,
});

const noSlots = vi.fn(async () => [] as AvailableSlot[]);
const oneSlot = vi.fn(async () => [slot()]);

describe('buildAiFilledPod', () => {
  it('takes the copy the model wrote', async () => {
    const next = await buildAiFilledPod(
      {
        pod_title: 'Sunday Badminton',
        pod_description: 'Doubles, all levels.',
        pod_hashtag_text: '#badminton',
        pod_info: 'Bring your own racquet.',
      },
      prev(),
      lookups(),
      oneSlot
    );

    expect(next.pod_title).toBe('Sunday Badminton');
    expect(next.pod_description).toBe('Doubles, all levels.');
    expect(next.pod_info).toBe('Bring your own racquet.');
  });

  it('keeps what the admin already had wherever the model said nothing', async () => {
    const next = await buildAiFilledPod({}, prev({ pod_title: 'Typed by hand' }), lookups(), oneSlot);

    expect(next.pod_title).toBe('Typed by hand');
  });

  it('refuses a pod type the Select has no item for, which would render blank', async () => {
    const next = await buildAiFilledPod(
      { pod_type: 'SOMETHING_INVENTED', pod_occurrence: 'FORTNIGHTLY_ISH' },
      prev(),
      lookups(),
      oneSlot
    );

    expect(next.pod_type).toBe('NATIVE_PAID');
    expect(next.pod_occurrence).toBe('ONE_TIME');
  });

  it('zeroes the price of a free pod, whatever the model priced it at', async () => {
    const next = await buildAiFilledPod(
      { pod_type: 'NATIVE_FREE', pod_amount: 500 },
      prev(),
      lookups(),
      oneSlot
    );

    expect(next.pod_amount).toBe(0);
  });

  it('prefers a club that has a venue, since one without cannot save a physical pod', async () => {
    const next = await buildAiFilledPod({}, prev(), lookups(), oneSlot);

    expect(next.club_id).toBe('club-1');
  });

  it('takes the club the model NAMED when that club can be used', async () => {
    const next = await buildAiFilledPod({ club_name: 'sunset club' }, prev(), lookups(), oneSlot);

    expect(next.club_id).toBe('club-1');
  });

  it('never overwrites a club the admin already chose', async () => {
    const next = await buildAiFilledPod(
      { club_name: 'Sunset Club' },
      prev({ club_id: 'club-2' }),
      lookups(),
      oneSlot
    );

    expect(next.club_id).toBe('club-2');
  });

  it('takes any club at all for a VIRTUAL pod, which needs no venue', async () => {
    const next = await buildAiFilledPod({ pod_mode: 'VIRTUAL' }, prev(), lookups(), noSlots);

    expect(next.club_id).toBe('club-2');
    expect(next.venue_id).toBe('');
  });

  it('adopts the venue linked to that club, and its next free slot', async () => {
    const next = await buildAiFilledPod({}, prev(), lookups(), oneSlot);

    expect(next.venue_id).toBe('venue-1');
    expect(next.venue_slot_id).toBe('slot-1');
    expect(next.pod_date_time?.toISOString()).toBe('2026-09-02T10:00:00.000Z');
  });

  it('takes the EARLIEST slot, not whichever came back first', async () => {
    const shuffled = vi.fn(async () => [
      slot({ id: 'later', start_at: '2026-09-09T10:00:00.000Z' }),
      slot({ id: 'sooner', start_at: '2026-09-02T10:00:00.000Z' }),
    ]);

    const next = await buildAiFilledPod({}, prev(), lookups(), shuffled);

    expect(next.venue_slot_id).toBe('sooner');
  });

  it('keeps a slot the admin already booked at the same venue, and asks for none', async () => {
    const fetchSlots = vi.fn(async () => [slot()]);
    const existing = prev({
      venue_id: 'venue-1',
      venue_slot_id: 'slot-existing',
      pod_date_time: new Date('2026-08-01T10:00:00.000Z'),
    });

    const next = await buildAiFilledPod({}, existing, lookups(), fetchSlots);

    expect(next.venue_slot_id).toBe('slot-existing');
    expect(fetchSlots).not.toHaveBeenCalled();
  });

  it('leaves a slot-driven pod with NO date when the venue calendar is empty', async () => {
    const next = await buildAiFilledPod({}, prev(), lookups(), noSlots);

    // Anything else silences "pick an available slot" and saves a physical pod
    // that never booked the space it claims.
    expect(next.venue_slot_id).toBe('');
    expect(next.pod_date_time).toBeNull();
    expect(next.pod_end_date_time).toBeNull();
  });

  it('proposes a date where the form is not slot-driven', async () => {
    const next = await buildAiFilledPod(
      { starts_in_days: 5, duration_minutes: 60 },
      prev(),
      lookups({ slotDrivenDates: false }),
      noSlots
    );

    expect(next.pod_date_time).toBeInstanceOf(Date);
    expect(
      (next.pod_end_date_time as Date).getTime() - (next.pod_date_time as Date).getTime()
    ).toBe(60 * 60 * 1000);
  });

  it('proposes a default distance and length when the model gave neither', async () => {
    const next = await buildAiFilledPod({}, prev(), lookups({ slotDrivenDates: false }), noSlots);

    expect(
      (next.pod_end_date_time as Date).getTime() - (next.pod_date_time as Date).getTime()
    ).toBe(90 * 60 * 1000);
  });

  it('keeps spots inside the booked capacity — the slider caps only the display', async () => {
    const next = await buildAiFilledPod({ no_of_spots: 40 }, prev(), lookups(), oneSlot);

    expect(next.no_of_spots).toBe(6);
  });

  it('leaves spots alone where the slot has no capacity recorded', async () => {
    const next = await buildAiFilledPod(
      { no_of_spots: 40 },
      prev(),
      lookups(),
      vi.fn(async () => [slot({ capacity: 0 })])
    );

    expect(next.no_of_spots).toBe(40);
  });

  it('assigns exactly one host — finance settles against the first', async () => {
    const next = await buildAiFilledPod({}, prev(), lookups(), oneSlot);

    expect(next.pod_hosts_id).toEqual(['host-1']);
  });

  it('never replaces hosts the admin already picked', async () => {
    const next = await buildAiFilledPod(
      {},
      prev({ pod_hosts_id: ['host-9'] }),
      lookups(),
      oneSlot
    );

    expect(next.pod_hosts_id).toEqual(['host-9']);
  });

  it('assigns no host at all when there are none to assign', async () => {
    const next = await buildAiFilledPod({}, prev(), lookups({ hosts: [] }), oneSlot);

    expect(next.pod_hosts_id).toEqual([]);
  });

  it('gives a VIRTUAL pod its meeting trio', async () => {
    const next = await buildAiFilledPod(
      {
        pod_mode: 'VIRTUAL',
        meeting_platform: 'GOOGLE_MEET',
        meeting_url: 'https://meet.google.com/abc-defg-hij',
        meeting_notes: 'Join five minutes early.',
      },
      prev(),
      lookups(),
      noSlots
    );

    expect(next.meeting_url).toBe('https://meet.google.com/abc-defg-hij');
    expect(next.meeting_notes).toBe('Join five minutes early.');
  });

  it('strips the meeting trio off a PHYSICAL pod, where a stale link fails validation', async () => {
    const next = await buildAiFilledPod(
      { pod_mode: 'PHYSICAL' },
      prev({ meeting_platform: 'ZOOM', meeting_url: 'https://zoom.us/j/1', meeting_notes: 'x' }),
      lookups(),
      oneSlot
    );

    expect(next.meeting_platform).toBe('');
    expect(next.meeting_url).toBe('');
    expect(next.meeting_notes).toBe('');
  });

  it('refuses a meeting platform the picker does not offer', async () => {
    const next = await buildAiFilledPod(
      { pod_mode: 'VIRTUAL', meeting_platform: 'CARRIER_PIGEON' },
      prev({ meeting_platform: 'ZOOM' }),
      lookups(),
      noSlots
    );

    expect(next.meeting_platform).toBe('ZOOM');
  });

  it('takes the chips the model wrote, and keeps the old ones when it wrote none', async () => {
    const filled = await buildAiFilledPod(
      { what_this_pod_offers: ['Coaching', 'Shuttles'], available_perks: ['Water'] },
      prev(),
      lookups(),
      oneSlot
    );
    expect(filled.what_this_pod_offers).toEqual(['Coaching', 'Shuttles']);

    const kept = await buildAiFilledPod(
      {},
      prev({ what_this_pod_offers: ['Already there'] }),
      lookups(),
      oneSlot
    );
    expect(kept.what_this_pod_offers).toEqual(['Already there']);
  });

  it('drops a place charge with no label, and caps the list at ten', async () => {
    const rows = Array.from({ length: 14 }, (_, index) => ({
      label: `Charge ${index}`,
      amount: '100',
      note: '  a note  ',
    }));

    const next = await buildAiFilledPod(
      { place_charges: [{ label: '   ', amount: 50 }, ...rows] },
      prev(),
      lookups(),
      oneSlot
    );

    expect(next.place_charges).toHaveLength(10);
    expect(next.place_charges[0]).toMatchObject({ label: 'Charge 0', amount: 100, note: 'a note' });
  });

  it('keeps the existing charges when the model sent something that is not a list', async () => {
    const next = await buildAiFilledPod(
      { place_charges: 'free parking' },
      prev({ place_charges: [{ label: 'Court fee', amount: 200, note: '' }] }),
      lookups(),
      oneSlot
    );

    expect(next.place_charges).toEqual([{ label: 'Court fee', amount: 200, note: '' }]);
  });

  it('survives being handed nothing at all', async () => {
    const next = await buildAiFilledPod(null, prev(), lookups(), oneSlot);

    expect(next.pod_title).toBe('');
    expect(next.club_id).toBe('club-1');
  });
});
