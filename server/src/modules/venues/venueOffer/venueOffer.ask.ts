/**
 * The ask beside an offer's price — the fewest guests, what the venue should
 * provide, and a note — cleaned and checked the same way whichever side writes
 * it. The text lands in the venue chat, emails and WhatsApp, so it passes the
 * chat's own content rules (no phone numbers, emails or outside links: the
 * chat header carries each side's contact details instead).
 */
import { GraphQLError } from 'graphql';
import { moderateText } from '@modules/moderation/moderation.rules';
import { isUploadedPhotoUrl } from '@utils/url';
import { OFFER_ASK_LIMITS, type VenueOfferAsk } from './venueOffer.types';

const bad = (message: string, extra: Record<string, unknown> = {}) =>
  new GraphQLError(message, { extensions: { code: 'BAD_USER_INPUT', ...extra } });

/** One line of text: inner whitespace (newlines included) collapsed to single spaces. */
const oneLine = (value: unknown) => String(value ?? '').replaceAll(/\s+/g, ' ').trim();

/** Refuses text the chat would refuse, naming what to remove. */
function assertClean(field: string, text: string) {
  const [first] = moderateText(field, text);
  if (first) throw bad(first.message, { reason: 'MODERATION_BLOCKED', type: first.type, field });
}

/**
 * The points the venue is asked to provide: trimmed, blanks and repeats
 * dropped, each one line and within bounds. `required` is Create Pod's rule —
 * a counter may hand back the same list unchanged.
 */
export function cleanOfferings(raw: readonly unknown[] | null | undefined, required: boolean): string[] {
  const seen = new Set<string>();
  const items: string[] = [];
  for (const entry of raw ?? []) {
    const text = oneLine(entry);
    const key = text.toLowerCase();
    if (!text || seen.has(key)) continue;
    if (text.length > OFFER_ASK_LIMITS.offeringLength) {
      throw bad(`Keep each point under ${OFFER_ASK_LIMITS.offeringLength} characters`);
    }
    assertClean('offerings', text);
    seen.add(key);
    items.push(text);
  }
  if (items.length > OFFER_ASK_LIMITS.offerings) throw bad(`List at most ${OFFER_ASK_LIMITS.offerings} points`);
  if (required && items.length === 0) throw bad('Add at least one thing you need from the venue');
  return items;
}

/** The free-text request, trimmed and within bounds. Line breaks are kept. */
export function cleanOfferNote(raw: unknown): string {
  const text = String(raw ?? '').trim();
  if (text.length > OFFER_ASK_LIMITS.note) throw bad(`Keep the note under ${OFFER_ASK_LIMITS.note} characters`);
  if (text) assertClean('note', text);
  return text;
}

/**
 * The photos a counter carries: each one uploaded from a device (our CDN, not a
 * stock library, not a video), repeats dropped, at most `OFFER_ASK_LIMITS.images`.
 */
export function cleanOfferImages(raw: readonly unknown[] | null | undefined): string[] {
  const typed = (raw ?? []).map((entry) => (typeof entry === 'string' ? entry.trim() : ''));
  const images = [...new Set(typed.filter(Boolean))];
  if (images.length > OFFER_ASK_LIMITS.images) throw bad(`Attach at most ${OFFER_ASK_LIMITS.images} photos`);
  if (images.some((url) => !isUploadedPhotoUrl(url))) throw bad('Attach photos uploaded from your device');
  return images;
}

/** The fewest guests: a whole number from 1 up to the most guests the booking is for. */
export function cleanMinGuests(raw: unknown, maxGuests: number): number {
  const n = Math.floor(Number(raw));
  if (!Number.isFinite(n) || n < 1) throw bad('Enter the fewest guests as 1 or more');
  if (maxGuests > 0 && n > maxGuests) throw bad(`The fewest guests cannot be more than the ${maxGuests} spots booked`);
  return n;
}

/** A whole ask, checked: Create Pod requires offerings, a counter may keep them as they were. */
export function cleanAsk(
  raw: { min_guests?: unknown; offerings?: readonly unknown[] | null; note?: unknown },
  maxGuests: number,
  opts: { offeringsRequired: boolean }
): VenueOfferAsk {
  return {
    min_guests: cleanMinGuests(raw.min_guests, maxGuests),
    offerings: cleanOfferings(raw.offerings, opts.offeringsRequired),
    note: cleanOfferNote(raw.note),
  };
}

/**
 * The fewest guests a NEW offer is made for: the venue's own minimum. The spots
 * a pod books run from that minimum up to the space's capacity, so fewer spots
 * are refused — unless the venue's minimum is more than the space even holds,
 * where the capacity is the most it can ask.
 */
export function openingMinGuests(venueMinimum: number, maxGuests: number, capacity: number): number {
  const minimum = Math.max(1, Math.floor(venueMinimum) || 1);
  const floor = capacity > 0 ? Math.min(minimum, capacity) : minimum;
  if (maxGuests < floor) {
    throw bad(`This venue takes bookings for at least ${floor} guests — pick ${floor} spots or more`, {
      reason: 'BELOW_VENUE_MINIMUM',
      min_guests: floor,
    });
  }
  return floor;
}
