/**
 * The ask beside an offer's price — the points the venue is to provide, the
 * note and the fewest guests — is cleaned and checked one way, whichever side
 * writes it, and with the venue chat's own content rules.
 */
import type { GraphQLError } from 'graphql';
import { cleanAsk, cleanMinGuests, cleanOfferImages, cleanOfferNote, cleanOfferings, openingMinGuests } from '../../venueOffer.ask';
import { OFFER_ASK_LIMITS } from '../../venueOffer.types';

/** The error a call throws, so its extensions can be read. */
function thrown(fn: () => unknown): GraphQLError {
  try {
    fn();
  } catch (error) {
    return error as GraphQLError;
  }
  throw new Error('expected the call to throw');
}

describe('cleanOfferings', () => {
  it('trims each point, collapses its whitespace to one line and drops blanks and repeats', () => {
    expect(
      cleanOfferings(['  Projector ', 'Snacks\n for   20', '', 'PROJECTOR', '   ', null, 'Parking'], false)
    ).toEqual(['Projector', 'Snacks for 20', 'Parking']);
  });

  it('takes no points at all unless the caller requires them', () => {
    expect(cleanOfferings(undefined, false)).toEqual([]);
    expect(cleanOfferings(null, false)).toEqual([]);
    expect(() => cleanOfferings([], true)).toThrow('Add at least one thing you need from the venue');
    expect(() => cleanOfferings(['   ', ''], true)).toThrow('Add at least one thing you need from the venue');
    expect(cleanOfferings(['Chairs'], true)).toEqual(['Chairs']);
  });

  it('allows a point up to the length limit and refuses a longer one', () => {
    // A neutral letter: the content rules read "xxx" as adult wording.
    const longest = 'm'.repeat(OFFER_ASK_LIMITS.offeringLength);
    expect(cleanOfferings([longest], false)).toEqual([longest]);
    const error = thrown(() => cleanOfferings([`${longest}y`], false));
    expect(error.message).toBe(`Keep each point under ${OFFER_ASK_LIMITS.offeringLength} characters`);
    expect(error.extensions).toMatchObject({ code: 'BAD_USER_INPUT' });
  });

  it('allows the most points and refuses one more', () => {
    const points = Array.from({ length: OFFER_ASK_LIMITS.offerings }, (_, i) => `Point ${i}`);
    expect(cleanOfferings(points, false)).toHaveLength(OFFER_ASK_LIMITS.offerings);
    expect(() => cleanOfferings([...points, 'One too many'], false)).toThrow(
      `List at most ${OFFER_ASK_LIMITS.offerings} points`
    );
  });

  it('refuses a point carrying a phone number, naming the field — the chat refuses the same', () => {
    const error = thrown(() => cleanOfferings(['Call me on 9876543210'], false));
    expect(error.extensions).toMatchObject({
      code: 'BAD_USER_INPUT',
      reason: 'MODERATION_BLOCKED',
      type: 'PHONE',
      field: 'offerings',
    });
  });
});

describe('cleanOfferNote', () => {
  it('trims the note and keeps its line breaks', () => {
    expect(cleanOfferNote('  Line one\nLine two  ')).toBe('Line one\nLine two');
  });

  it('reads nothing as an empty note', () => {
    expect(cleanOfferNote(undefined)).toBe('');
    expect(cleanOfferNote(null)).toBe('');
    expect(cleanOfferNote('   ')).toBe('');
  });

  it('allows a note up to the limit and refuses a longer one', () => {
    const longest = 'n'.repeat(OFFER_ASK_LIMITS.note);
    expect(cleanOfferNote(longest)).toBe(longest);
    expect(() => cleanOfferNote(`${longest}!`)).toThrow(`Keep the note under ${OFFER_ASK_LIMITS.note} characters`);
  });

  it('refuses a note carrying an email address', () => {
    const error = thrown(() => cleanOfferNote('Write to venue.owner@example.com for the menu'));
    expect(error.extensions).toMatchObject({ reason: 'MODERATION_BLOCKED', type: 'EMAIL', field: 'note' });
  });
});

describe('cleanOfferImages', () => {
  const photo = (name: string) => `https://ik.imagekit.io/duncit/staging/offer/${name}.jpg`;

  it('reads no photos as none', () => {
    expect(cleanOfferImages(undefined)).toEqual([]);
    expect(cleanOfferImages(null)).toEqual([]);
    expect(cleanOfferImages([])).toEqual([]);
  });

  it('trims each address and drops blanks and repeats, keeping the order they were attached in', () => {
    expect(cleanOfferImages([`  ${photo('b')} `, '', null, photo('a'), photo('b'), '   '])).toEqual([photo('b'), photo('a')]);
  });

  it('allows the most photos and refuses one more, counting a repeat once', () => {
    const most = ['a', 'b', 'c', 'd'].map(photo);
    expect(most).toHaveLength(OFFER_ASK_LIMITS.images);
    expect(cleanOfferImages([...most, photo('a')])).toEqual(most);
    const error = thrown(() => cleanOfferImages([...most, photo('e')]));
    expect(error.message).toBe(`Attach at most ${OFFER_ASK_LIMITS.images} photos`);
    expect(error.extensions).toMatchObject({ code: 'BAD_USER_INPUT' });
  });

  it.each([
    ['a stock-library image', 'https://images.pexels.com/photos/1/hall.jpg'],
    ['a video', 'https://ik.imagekit.io/duncit/staging/offer/tour.mp4'],
    ['an http address', 'http://ik.imagekit.io/duncit/staging/offer/hall.jpg'],
    ['text that is not an address', 'my photo'],
  ])('refuses %s, even beside a good photo', (_label, bad) => {
    const error = thrown(() => cleanOfferImages([photo('a'), bad]));
    expect(error.message).toBe('Attach photos uploaded from your device');
    expect(error.extensions).toMatchObject({ code: 'BAD_USER_INPUT' });
  });
});

describe('cleanMinGuests', () => {
  it('takes a whole number of guests, rounding a fraction down', () => {
    expect(cleanMinGuests(6, 10)).toBe(6);
    expect(cleanMinGuests('7', 10)).toBe(7);
    expect(cleanMinGuests(8.9, 10)).toBe(8);
    expect(cleanMinGuests(10, 10)).toBe(10);
  });

  it('refuses fewer than one guest or no number at all', () => {
    expect(() => cleanMinGuests(0, 10)).toThrow('Enter the fewest guests as 1 or more');
    expect(() => cleanMinGuests(-3, 10)).toThrow('Enter the fewest guests as 1 or more');
    expect(() => cleanMinGuests('many', 10)).toThrow('Enter the fewest guests as 1 or more');
    expect(() => cleanMinGuests(undefined, 10)).toThrow('Enter the fewest guests as 1 or more');
  });

  it('refuses more than the guests booked, and has no ceiling when none is known', () => {
    expect(() => cleanMinGuests(11, 10)).toThrow('The fewest guests cannot be more than the 10 spots booked');
    expect(cleanMinGuests(500, 0)).toBe(500);
  });
});

describe('cleanAsk', () => {
  it('cleans the three parts together', () => {
    expect(cleanAsk({ min_guests: '4', offerings: [' Mats ', 'mats'], note: ' Quiet room ' }, 12, { offeringsRequired: true })).toEqual({
      min_guests: 4,
      offerings: ['Mats'],
      note: 'Quiet room',
    });
  });

  it('enforces the points only when asked to', () => {
    expect(cleanAsk({ min_guests: 2 }, 5, { offeringsRequired: false })).toEqual({ min_guests: 2, offerings: [], note: '' });
    expect(() => cleanAsk({ min_guests: 2 }, 5, { offeringsRequired: true })).toThrow(
      'Add at least one thing you need from the venue'
    );
  });
});

describe('openingMinGuests', () => {
  it("is the venue's own minimum when the pod books at least that many spots", () => {
    expect(openingMinGuests(8, 20, 30)).toBe(8);
    expect(openingMinGuests(8, 8, 30)).toBe(8);
  });

  it("refuses fewer spots than the venue's minimum, saying how many it takes", () => {
    const error = thrown(() => openingMinGuests(8, 6, 30));
    expect(error.message).toBe('This venue takes bookings for at least 8 guests — pick 8 spots or more');
    expect(error.extensions).toMatchObject({ code: 'BAD_USER_INPUT', reason: 'BELOW_VENUE_MINIMUM', min_guests: 8 });
  });

  it('never asks for more than the space holds', () => {
    expect(openingMinGuests(8, 5, 5)).toBe(5);
    expect(thrown(() => openingMinGuests(8, 4, 5)).extensions).toMatchObject({ min_guests: 5 });
  });

  it('uses the minimum as it is when the capacity is unknown', () => {
    expect(openingMinGuests(8, 10, 0)).toBe(8);
  });

  it('treats a missing or zero minimum as one guest', () => {
    expect(openingMinGuests(0, 3, 10)).toBe(1);
    expect(openingMinGuests(Number.NaN, 3, 10)).toBe(1);
  });
});
