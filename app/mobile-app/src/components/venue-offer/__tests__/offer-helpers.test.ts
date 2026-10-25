import { fallbackT } from '@/i18n/fallback';
import { offerAnswerCopy } from '@/components/venue-offer/answer-copy';
import {
  offerMoneyRange,
  offerStepTerms,
  offerTermsText,
} from '@/components/venue-offer/offer-format';
import { offerPriceTermsInput, offerTermsInput } from '@/components/venue-offer/offer-terms-input';
import { VenueOfferModel } from '@/generated/graphql/graphql';

const vars = { pod: 'Sunday Badminton', venue: 'Court House', when: 'Sat 6 pm', amount: '₹6,000' };

describe('offerTermsText', () => {
  it('names the option and its amount', () => {
    expect(offerTermsText(fallbackT, 'PER_GUEST', 300)).toBe('Per guest · ₹300 per guest');
  });

  it('is just the amount for an option this build does not know', () => {
    expect(offerTermsText(fallbackT, 'PER_DAY', 1500)).toBe('₹1,500');
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

  it('prices on the option, the amount and the minimum — never the points', () => {
    expect(
      offerPriceTermsInput({ model: 'PER_HOUR', rate: 900, min_guests: 4, offerings: ['Mic'] }),
    ).toEqual({ model: VenueOfferModel.PerHour, rate: 900, min_guests: 4 });
    expect(offerPriceTermsInput({ model: 'PER_SLOT', rate: 5000, offerings: ['Mic'] })).toEqual({
      model: VenueOfferModel.PerSlot,
      rate: 5000,
    });
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
    expect(offerAnswerCopy(fallbackT, 'HOST', 'accept', vars, true)).toEqual({
      title: "Accept the venue's terms?",
      message:
        '“Sunday Badminton” goes live at Court House on Sat 6 pm. The venue receives ₹6,000.',
      reasonLabel: '',
    });
    expect(offerAnswerCopy(fallbackT, 'HOST', 'reject', vars, false)).toEqual({
      title: "Reject the venue's terms?",
      message: 'The venue keeps the time free for others, and you can send a new offer.',
      reasonLabel: 'Reason for the venue (optional)',
    });
  });
});
