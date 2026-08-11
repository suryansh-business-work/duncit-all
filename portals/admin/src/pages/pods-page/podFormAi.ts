import {
  OCCURRENCES,
  POD_MODES,
  POD_TYPES,
  type PodFormValues,
  type PodMode,
  type PodPlaceCharge,
} from '@duncit/pod-form';
import { MEETING_PLATFORMS } from './meeting-platforms';
import { aiChips, aiOneOf, aiText } from '../../components/aiFillSanitize';

const POD_TYPE_VALUES = POD_TYPES.map((option) => option.value);
const OCCURRENCE_VALUES = OCCURRENCES.map((option) => option.value);
const POD_MODE_VALUES = POD_MODES.map((option) => option.value as PodMode);
const MEETING_PLATFORM_VALUES = MEETING_PLATFORMS.map((option) => option.value);

/** The lists the pod pickers are populated from. Resolving against exactly
 * these is what guarantees a filled club / venue / host is one the field can
 * render — an id from anywhere else shows as an empty select. */
export interface PodFillLookups {
  clubs: any[];
  /** Approved venues (the only ones the venue select offers). */
  venues: any[];
  /** Approved hosts. */
  hosts: any[];
  /** Venue ids linked to a club, as the form reads them. */
  clubVenueIds: (club: any) => string[];
  /** `config.showVenueSlot` — when on, a physical pod's date/time comes from a
   * booked slot and the date pickers are not rendered at all. */
  slotDrivenDates: boolean;
}

/** One bookable venue slot, as `venueAvailableSlots` returns it. */
export interface AvailableSlot {
  id: string;
  start_at: string;
  end_at: string;
  /** Guests the booked space holds. 0 = unset. */
  capacity: number;
}

const sameName = (a: unknown, b: unknown) =>
  typeof a === 'string' &&
  typeof b === 'string' &&
  !!a.trim() &&
  a.trim().toLowerCase() === b.trim().toLowerCase();

const sanitizeCharges = (input: unknown): PodPlaceCharge[] | undefined => {
  if (!Array.isArray(input)) return undefined;
  return input
    .map((row: any) => ({
      label: typeof row?.label === 'string' ? row.label.trim() : '',
      amount: Number(row?.amount) || 0,
      note: typeof row?.note === 'string' ? row.note.trim() : '',
    }))
    .filter((row) => row.label)
    .slice(0, 10);
};

/** A VIRTUAL pod needs its meeting trio; a PHYSICAL one must not carry one
 * (CascadeEffect clears it anyway, and a stale link fails validation). */
function meetingFieldsFor(d: any, mode: PodMode, prev: PodFormValues) {
  if (mode !== 'VIRTUAL') return { meeting_platform: '', meeting_url: '', meeting_notes: '' };
  return {
    meeting_platform: aiOneOf(d?.meeting_platform, MEETING_PLATFORM_VALUES) ?? prev.meeting_platform,
    meeting_url: aiText(d?.meeting_url) ?? prev.meeting_url,
    meeting_notes: aiText(d?.meeting_notes) ?? prev.meeting_notes,
  };
}

/** The approved venues the club is linked to — what the venue select lists. */
const linkedVenues = (clubId: string, lookups: PodFillLookups) => {
  const club = lookups.clubs.find((item) => String(item?.id) === clubId);
  const ids = new Set(lookups.clubVenueIds(club));
  return lookups.venues.filter((venue) => ids.has(venue?.id));
};

/**
 * The club the pod hangs off. The model names one from the real club list, so
 * the copy and the club agree — but a PHYSICAL pod also needs a venue linked to
 * that club, and one with none cannot be saved, so it loses to a club that has.
 *
 * A club already chosen (the page's club filter, or the pod being edited) is
 * left alone: it is a real decision the fill has no business overwriting.
 */
function pickClub(d: any, prev: PodFormValues, mode: PodMode, lookups: PodFillLookups): string {
  if (prev.club_id) return prev.club_id;
  const usable = (club: any) =>
    mode === 'VIRTUAL' || linkedVenues(String(club?.id), lookups).length > 0;
  const named = lookups.clubs.find((club) => sameName(club?.club_name, d?.club_name));
  if (named && usable(named)) return String(named.id);
  const chosen = lookups.clubs.find(usable) ?? named;
  return chosen ? String(chosen.id) : '';
}

/** The venue's next free slot — the only way the admin form sets a pod's
 * date/time, since the date pickers give way to the slot calendar. */
function nextSlot(slots: AvailableSlot[]): AvailableSlot | null {
  const ordered = [...slots];
  ordered.sort((a, b) => a.start_at.localeCompare(b.start_at));
  return ordered[0] ?? null;
}

/** Spots stay inside the booked space: the slider caps the DISPLAY at capacity,
 * so a bigger number would be saved without the admin ever seeing it. */
const boundedSpots = (spots: number, slot: AvailableSlot | null) =>
  slot && slot.capacity > 0 ? Math.min(spots, slot.capacity) : spots;

/** The club / venue / host / slot the fill adopts, each only when the form does
 * not already hold one. */
async function resolveLinks(
  d: any,
  prev: PodFormValues,
  mode: PodMode,
  lookups: PodFillLookups,
  fetchSlots: (venueId: string) => Promise<AvailableSlot[]>,
) {
  const clubId = pickClub(d, prev, mode, lookups);
  const virtual = mode === 'VIRTUAL';
  const venueId = virtual ? '' : prev.venue_id || String(linkedVenues(clubId, lookups)[0]?.id ?? '');
  const hosts = prev.pod_hosts_id.length > 0 ? prev.pod_hosts_id : firstHostIds(lookups);
  const keepSlot = !!prev.venue_slot_id && venueId === prev.venue_id;
  const slot = venueId && !keepSlot ? nextSlot(await fetchSlots(venueId)) : null;
  return { clubId, venueId, hosts, keepSlot, slot };
}

/** Exactly one host: admin settles finance against `pod_hosts_id[0]`. */
function firstHostIds(lookups: PodFillLookups): string[] {
  const id = lookups.hosts[0]?.user_id;
  return id ? [String(id)] : [];
}

/** Start/end for a pod with no slot to take them from — a virtual pod, or a
 * venue whose calendar is empty. */
function proposedDates(d: any) {
  const startsInDays = Number(d?.starts_in_days) || 3;
  const durationMinutes = Number(d?.duration_minutes) || 90;
  const start = new Date();
  start.setDate(start.getDate() + startsInDays);
  start.setHours(19, 0, 0, 0);
  return { start, end: new Date(start.getTime() + durationMinutes * 60 * 1000) };
}

function scheduleFor(
  d: any,
  prev: PodFormValues,
  links: Awaited<ReturnType<typeof resolveLinks>>,
  slotDriven: boolean,
) {
  if (links.keepSlot) {
    return {
      venue_slot_id: prev.venue_slot_id,
      pod_date_time: prev.pod_date_time,
      pod_end_date_time: prev.pod_end_date_time,
    };
  }
  if (links.slot) {
    return {
      venue_slot_id: links.slot.id,
      pod_date_time: new Date(links.slot.start_at),
      pod_end_date_time: new Date(links.slot.end_at),
    };
  }
  // A venue whose calendar is empty gets no date at all: an invented one would
  // silence the form's "Pick an available slot" and save a physical pod that
  // never booked the space it claims.
  if (slotDriven && links.venueId) {
    return { venue_slot_id: '', pod_date_time: null, pod_end_date_time: null };
  }
  const { start, end } = proposedDates(d);
  return { venue_slot_id: '', pod_date_time: start, pod_end_date_time: end };
}

/**
 * Merge an AI fill into the pod form.
 *
 * The copy fields the model writes are only half a pod: club, venue, host and
 * the slot that sets its date & time are ids the model cannot invent, and
 * leaving them out is what made a filled form still fail to save. They are
 * resolved here against the very lists the pickers render, so everything filled
 * in is something the form can show and the server will accept.
 */
export async function buildAiFilledPod(
  d: any,
  prev: PodFormValues,
  lookups: PodFillLookups,
  fetchSlots: (venueId: string) => Promise<AvailableSlot[]>,
): Promise<PodFormValues> {
  const podMode = aiOneOf<PodMode>(d?.pod_mode, POD_MODE_VALUES) ?? prev.pod_mode;
  const links = await resolveLinks(d, prev, podMode, lookups, fetchSlots);
  const offers = aiChips(d?.what_this_pod_offers);
  const perks = aiChips(d?.available_perks);
  const charges = sanitizeCharges(d?.place_charges);

  const next: PodFormValues = {
    ...prev,
    pod_title: d?.pod_title ?? prev.pod_title,
    pod_description: d?.pod_description ?? prev.pod_description,
    pod_hashtag_text: d?.pod_hashtag_text ?? prev.pod_hashtag_text,
    media_text: d?.media_text ?? prev.media_text,
    pod_info: d?.pod_info ?? prev.pod_info,
    club_id: links.clubId,
    venue_id: links.venueId,
    pod_hosts_id: links.hosts,
    no_of_spots: boundedSpots(Number(d?.no_of_spots) || prev.no_of_spots, links.slot),
    pod_amount: Number(d?.pod_amount) || prev.pod_amount,
    // Anything outside POD_TYPES/OCCURRENCES has no MenuItem to match, so the
    // Select would render blank — keep what the admin already had instead.
    pod_type: aiOneOf(d?.pod_type, POD_TYPE_VALUES) ?? prev.pod_type,
    pod_occurrence: aiOneOf(d?.pod_occurrence, OCCURRENCE_VALUES) ?? prev.pod_occurrence,
    pod_mode: podMode,
    ...meetingFieldsFor(d, podMode, prev),
    zone_name: d?.zone_name ?? prev.zone_name,
    ...scheduleFor(d, prev, links, lookups.slotDrivenDates),
    payment_terms: typeof d?.payment_terms === 'string' ? d.payment_terms : prev.payment_terms,
    what_this_pod_offers: offers ?? prev.what_this_pod_offers,
    available_perks: perks ?? prev.available_perks,
    place_charges: charges ?? prev.place_charges,
  };

  if (next.pod_type?.includes('FREE')) next.pod_amount = 0;
  return next;
}
