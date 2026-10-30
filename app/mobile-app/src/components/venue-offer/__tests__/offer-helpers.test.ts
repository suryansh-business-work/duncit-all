import { fallbackT } from '@/i18n/fallback';
import { offerAnswerCopy } from '@/components/venue-offer/answer-copy';
import {
  freeMoneyLine,
  freeReasonNote,
  offerMoneyRange,
  offerStepTerms,
  offerTermsText,
} from '@/components/venue-offer/offer-format';
import {
  appFreeJustification,
  hostOfferInput,
  hostOfferModelEnum,
  offerModelEnum,
  offerPriceTermsInput,
  offerTermsInput,
} from '@/components/venue-offer/offer-terms-input';
import { FreeArrangementReason, VenueOfferModel } from '@/generated/graphql/graphql';

const PHOTO = 'https://ik.imagekit.io/duncit/chat/setup.jpg';
const vars = { pod: 'Sunday Badminton', venue: 'Court House', when: 'Sat 6 pm', amount: '₹6,000' };

describe('offerTermsText', () => {
  it('names the option and its amount', () => {
    expect(offerTermsText(fallbackT, 'PER_GUEST', 300)).toBe('Per guest · ₹300 per guest');
  });

  it('is just the amount for an option this build does not know', () => {
    expect(offerTermsText(fallbackT, 'PER_DAY', 1500)).toBe('₹1,500');
  });

  it('names a free venue without a ₹0 money line', () => {
    expect(offerTermsText(fallbackT, 'FREE', 0)).toBe('Free venue');
  });
});

describe('freeMoneyLine', () => {
  it('stands aside for priced terms, so the money shows', () => {
    expect(freeMoneyLine(fallbackT, 'VENUE', false, 'PER_GUEST')).toBeNull();
    expect(freeMoneyLine(fallbackT, 'HOST', false, 'FLAT')).toBeNull();
  });

  it("tells each side a free pod's venue is settled directly", () => {
    expect(freeMoneyLine(fallbackT, 'VENUE', true, 'FLAT')).toBe(
      'Free pod: the host settles your charges with you directly, so no amount is quoted here.',
    );
    expect(freeMoneyLine(fallbackT, 'HOST', true, 'FREE')).toBe(
      "Free pod: you settle the venue's charges with it directly, so no amount is quoted here.",
    );
  });

  it('tells the host a free venue is paid nothing, and leaves the venue to read the reason', () => {
    expect(freeMoneyLine(fallbackT, 'HOST', false, 'FREE')).toMatch(
      /^Free venue: the venue is paid nothing for this booking\./,
    );
    expect(freeMoneyLine(fallbackT, 'VENUE', false, 'FREE')).toBe('');
  });
});

describe('freeReasonNote', () => {
  it('names the reason, with the details when the host gave them', () => {
    expect(freeReasonNote(fallbackT, { reason: 'PROMOTIONAL', details: '' })).toBe(
      'Requested free — Promotional offer',
    );
    expect(freeReasonNote(fallbackT, { reason: 'OTHER', details: ' Launch week ' })).toBe(
      'Requested free — Other: Launch week',
    );
  });

  it('says nothing for a priced offer or a reason this build does not know', () => {
    expect(freeReasonNote(fallbackT, null)).toBe('');
    expect(freeReasonNote(fallbackT, { reason: 'BARTER', details: 'x' })).toBe('');
  });
});

describe('offerMoneyRange', () => {
  it('reads one amount when both ends of the guests cost the same', () => {
    expect(offerMoneyRange(6000, 6000)).toBe('₹6,000');
  });

  it('reads the fewest guests first, then the most', () => {
    expect(offerMoneyRange(2400, 6000)).toBe('₹2,400 – ₹6,000');
  });
});

describe('offerStepTerms', () => {
  it('is empty for a step that named no terms (an accept or a reject)', () => {
    expect(offerStepTerms(fallbackT, { model: null, rate: null })).toBe('');
    expect(offerStepTerms(fallbackT, { model: 'FLAT', rate: 0 })).toBe('');
  });

  it('adds the fewest guests a step named', () => {
    expect(offerStepTerms(fallbackT, { model: 'PER_GUEST', rate: 300, min_guests: 12 })).toBe(
      'Per guest · ₹300 per guest · at least 12 guests',
    );
  });

  it('leaves the minimum out when the step named none', () => {
    expect(offerStepTerms(fallbackT, { model: 'FLAT', rate: 7000, min_guests: 0 })).toBe(
      'Flat price · ₹7,000 flat',
    );
  });

  it('names a free venue step, which carries no amount', () => {
    expect(offerStepTerms(fallbackT, { model: 'FREE', rate: 0 })).toBe('Free venue');
  });
});

describe('offerTermsInput', () => {
  it('sends the codegen enum, the points and a named minimum', () => {
    expect(
      offerTermsInput({ model: 'PER_GUEST', rate: 350, min_guests: 10, offerings: ['Chairs'] }),
    ).toEqual({
      model: VenueOfferModel.PerGuest,
      rate: 350,
      min_guests: 10,
      offerings: ['Chairs'],
    });
  });

  it('leaves the minimum on the table when none is named', () => {
    expect(offerTermsInput({ model: 'FLAT', rate: 7000, offerings: [] })).toEqual({
      model: VenueOfferModel.Flat,
      rate: 7000,
      offerings: [],
    });
  });

  it('prices on the option, the amount and the minimum — never the points or the photos', () => {
    expect(
      offerPriceTermsInput({ model: 'PER_HOUR', rate: 900, min_guests: 4, offerings: ['Mic'] }),
    ).toEqual({ model: VenueOfferModel.PerHour, rate: 900, min_guests: 4 });
    expect(
      offerPriceTermsInput({ model: 'FLAT', rate: 5000, offerings: ['Mic'], images: [PHOTO] }),
    ).toEqual({ model: VenueOfferModel.Flat, rate: 5000 });
  });

  it('sends the photos attached to a counter, and none when there are none', () => {
    expect(
      offerTermsInput({ model: 'FLAT', rate: 5000, offerings: ['Mic'], images: [PHOTO] }),
    ).toEqual({ model: VenueOfferModel.Flat, rate: 5000, offerings: ['Mic'], images: [PHOTO] });
    expect(
      offerTermsInput({ model: 'FLAT', rate: 5000, offerings: [], images: [] }),
    ).not.toHaveProperty('images');
  });
});

describe('offerModelEnum', () => {
  it('maps each of the three pricing options to the enum, and nothing else', () => {
    expect(offerModelEnum('PER_GUEST')).toBe(VenueOfferModel.PerGuest);
    expect(offerModelEnum('PER_HOUR')).toBe(VenueOfferModel.PerHour);
    expect(offerModelEnum('FLAT')).toBe(VenueOfferModel.Flat);
    // The retired per-slot option is no longer a pricing option.
    expect(offerModelEnum('PER_SLOT')).toBeNull();
    expect(offerModelEnum('')).toBeNull();
    expect(offerModelEnum(null)).toBeNull();
    // A free venue is an opening offer only, never a counter's or a venue guide's basis.
    expect(offerModelEnum('FREE')).toBeNull();
  });

  it('maps a host opening offer, free venue included', () => {
    expect(hostOfferModelEnum('FREE')).toBe(VenueOfferModel.Free);
    expect(hostOfferModelEnum('PER_HOUR')).toBe(VenueOfferModel.PerHour);
    expect(hostOfferModelEnum('PER_SLOT')).toBeNull();
  });
});

describe('hostOfferInput', () => {
  const booking = {
    start_at: '2030-03-05T12:30:00.000Z',
    end_at: '2030-03-05T14:30:00.000Z',
    space_label: '',
    pax: 12,
    pets: false,
  };

  it('sends a priced offer with the codegen enum and no free reason', () => {
    expect(hostOfferInput({ ...booking, model: 'FLAT', rate: 5000, offerings: ['Mic'] })).toEqual({
      ...booking,
      model: VenueOfferModel.Flat,
      rate: 5000,
      offerings: ['Mic'],
    });
  });

  it("sends a free venue with its reason mapped onto the codegen's enum", () => {
    expect(
      hostOfferInput({
        ...booking,
        model: 'FREE',
        rate: 0,
        free_justification: { reason: 'CAMPAIGN', details: '', accepted: true },
      }),
    ).toEqual({
      ...booking,
      model: VenueOfferModel.Free,
      rate: 0,
      free_justification: { reason: FreeArrangementReason.Campaign, details: '', accepted: true },
    });
  });
});

describe('appFreeJustification', () => {
  it('is the justification once it is complete and accepted', () => {
    expect(
      appFreeJustification({ reason: 'OTHER', details: ' A  launch ', accepted: true }),
    ).toEqual({ reason: FreeArrangementReason.Other, details: 'A launch', accepted: true });
  });

  it('is nothing until a reason is picked, Other is explained and the policy accepted', () => {
    expect(appFreeJustification({ reason: '', accepted: true })).toBeNull();
    expect(appFreeJustification({ reason: 'OTHER', details: 'ok', accepted: true })).toBeNull();
    expect(appFreeJustification({ reason: 'INITIATIVE', accepted: false })).toBeNull();
  });
});

describe('offerAnswerCopy', () => {
  it('names what goes live and what the venue receives when the venue accepts', () => {
    expect(offerAnswerCopy(fallbackT, 'VENUE', 'accept', vars, false)).toEqual({
      title: 'Accept this booking?',
      message: '“Sunday Badminton” goes live at Court House on Sat 6 pm, and you receive ₹6,000.',
      reasonLabel: '',
    });
  });

  it('names no amount when the venue accepts a free pod', () => {
    expect(offerAnswerCopy(fallbackT, 'VENUE', 'accept', vars, true).message).toBe(
      '“Sunday Badminton” goes live at Court House on Sat 6 pm.',
    );
  });

  it('asks the venue for a reason for the host when it rejects', () => {
    expect(offerAnswerCopy(fallbackT, 'VENUE', 'reject', vars, false)).toEqual({
      title: 'Reject this booking?',
      message: 'The host is told, and the time is free again at your venue.',
      reasonLabel: 'Reason for the host (optional)',
    });
  });

  it("words the host's answers to the venue's counter", () => {
    expect(offerAnswerCopy(fallbackT, 'HOST', 'accept', vars, false)).toEqual({
      title: "Accept the venue's terms?",
      message:
        '“Sunday Badminton” goes live at Court House on Sat 6 pm. The venue receives ₹6,000.',
      reasonLabel: '',
    });
    // A free arrangement pays the venue nothing through Duncit, so no amount is named.
    expect(offerAnswerCopy(fallbackT, 'HOST', 'accept', vars, true).message).toBe(
      '“Sunday Badminton” goes live at Court House on Sat 6 pm.',
    );
    expect(offerAnswerCopy(fallbackT, 'HOST', 'reject', vars, false)).toEqual({
      title: "Reject the venue's terms?",
      message: 'The venue keeps the time free for others, and you can send a new offer.',
      reasonLabel: 'Reason for the venue (optional)',
    });
  });
});
