import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';

import {
  VenueOfferActions,
  type VenueOfferSubject,
} from '@/components/venue-offer/VenueOfferActions';
import { VenueOfferStatus } from '@/generated/graphql/graphql';
import { renderWithProviders } from '@/utils/test-utils';
import { counteredOffer, offerTerms, venueAnswersApi } from '@/utils/venue-offer-fixture';
import type { OfferTerms } from '@/components/venue-offer/offer-format';
import type { VenueOfferAnswers } from '@/hooks/useVenueOfferAnswers';

// The counter sheet's live price is its own hook's business (useCounterQuote.test).
jest.mock('@/hooks/useCounterQuote', () => ({
  useCounterQuote: () => ({ result: null, error: null, isLoading: false }),
}));

const subject: VenueOfferSubject = {
  pod_title: 'Sunday Badminton',
  venue_name: 'Court House',
  start_at: '2026-09-02T10:00:00.000Z',
  end_at: '2026-09-02T12:00:00.000Z',
  whole_day: false,
  pod_is_free: false,
  price: 1200,
};

const mount = (
  offer: OfferTerms | null,
  answers: VenueOfferAnswers = venueAnswersApi(),
  over: Partial<VenueOfferSubject> = {},
) => {
  renderWithProviders(
    <VenueOfferActions
      slotId="slot-1"
      offer={offer}
      subject={{ ...subject, ...over }}
      answers={answers}
      testIDPrefix="req"
    />,
  );
  return answers;
};

const confirm = async () => {
  await act(async () => {
    fireEvent.press(screen.getByTestId('offer-answer-confirm'));
  });
};

describe('VenueOfferActions', () => {
  it('answers a request from before offers with accept or reject only, at its slot price', async () => {
    const answers = mount(null);
    expect(screen.queryByTestId('req-counter')).toBeNull();
    fireEvent.press(screen.getByTestId('req-accept'));
    expect(screen.getByText('Accept this booking?')).toBeOnTheScreen();
    expect(screen.getByText(/and you receive ₹1,200\.$/)).toBeOnTheScreen();
    await confirm();
    expect(answers.accept).toHaveBeenCalledWith('slot-1', null);
    await waitFor(() => expect(screen.queryByTestId('offer-answer-sheet')).toBeNull());
  });

  it('accepts a fresh offer for the round on screen, naming what the venue receives as a range', async () => {
    const answers = mount(offerTerms());
    fireEvent.press(screen.getByTestId('req-accept'));
    expect(screen.getByText(/you receive ₹2,400 – ₹6,000\.$/)).toBeOnTheScreen();
    await confirm();
    expect(answers.accept).toHaveBeenCalledWith('slot-1', 1);
  });

  it('names no amount when accepting a free pod', () => {
    mount(offerTerms(), venueAnswersApi(), { pod_is_free: true });
    fireEvent.press(screen.getByTestId('req-accept'));
    expect(
      screen.getByText(/^“Sunday Badminton” goes live at Court House on .+\.$/),
    ).toBeOnTheScreen();
    expect(screen.queryByText(/you receive/)).toBeNull();
  });

  it("keeps the sheet open with the server's reason when an answer is refused", async () => {
    const answers = mount(
      offerTerms(),
      venueAnswersApi({ error: 'This booking has started' }, false),
    );
    fireEvent.press(screen.getByTestId('req-accept'));
    await confirm();
    expect(answers.accept).toHaveBeenCalled();
    expect(screen.getByTestId('offer-answer-sheet')).toBeOnTheScreen();
    expect(screen.getByTestId('offer-answer-error')).toHaveTextContent('This booking has started');
  });

  it('rejects with the optional reason, trimmed', async () => {
    const answers = mount(offerTerms());
    fireEvent.press(screen.getByTestId('req-reject'));
    expect(screen.getByText('Reason for the host (optional)')).toBeOnTheScreen();
    fireEvent.changeText(screen.getByTestId('field-reason'), '  Booked out  ');
    await confirm();
    expect(answers.reject).toHaveBeenCalledWith('slot-1', 'Booked out', 1);
  });

  it('clears a refusal when the sheet is closed', () => {
    const answers = mount(offerTerms());
    fireEvent.press(screen.getByTestId('req-reject'));
    fireEvent.press(screen.getByTestId('offer-answer-cancel'));
    expect(answers.clearError).toHaveBeenCalled();
    expect(screen.queryByTestId('offer-answer-sheet')).toBeNull();
  });

  it('counters from the terms on the table and sends them for the round on screen', async () => {
    const answers = mount(offerTerms());
    fireEvent.press(screen.getByTestId('req-counter'));
    expect(screen.getByText('Counter offer')).toBeOnTheScreen();
    fireEvent.changeText(screen.getByTestId('field-rate'), '320');
    await act(async () => {
      fireEvent.press(screen.getByTestId('venue-offer-counter-send'));
    });
    expect(answers.counter).toHaveBeenCalledWith(
      'slot-1',
      { model: 'PER_GUEST', rate: 320, min_guests: 8, offerings: ['A projector', '10 chairs'] },
      '',
      1,
    );
    await waitFor(() => expect(screen.queryByTestId('venue-offer-counter')).toBeNull());
  });

  it('changes its own counter while the host decides — it cannot accept then', () => {
    mount(counteredOffer());
    expect(screen.queryByTestId('req-accept')).toBeNull();
    // The button carries its icon beside the label, so the label is matched, not the whole text.
    expect(screen.getByTestId('req-counter')).toHaveTextContent(/Change counter/);
    expect(screen.getByTestId('req-reject')).toBeOnTheScreen();
  });

  it('offers nothing once the offer is closed', () => {
    mount(offerTerms({ status: VenueOfferStatus.Accepted }));
    expect(screen.queryByTestId('req-accept')).toBeNull();
    expect(screen.queryByTestId('req-reject')).toBeNull();
    expect(screen.queryByTestId('req-counter')).toBeNull();
  });
});

describe('VenueOfferActions — the counters each side may make', () => {
  it('names how many counters the venue has left beside Counter', () => {
    mount(offerTerms({ venue_counters_used: 2 }));
    expect(screen.getByTestId('req-counter')).toBeOnTheScreen();
    expect(screen.getByTestId('req-counters-left')).toHaveTextContent('1 of 3 counters left');
  });

  it('hides Counter once the venue has used its share, leaving accept or reject', () => {
    mount(offerTerms({ venue_counters_used: 3 }));
    expect(screen.queryByTestId('req-counter')).toBeNull();
    expect(screen.getByTestId('req-accept')).toBeOnTheScreen();
    expect(screen.getByTestId('req-counters-left')).toHaveTextContent(
      'You have used all your counters — accept or reject',
    );
  });

  it('names no allowance for a request from before offers', () => {
    mount(null);
    expect(screen.queryByTestId('req-counters-left')).toBeNull();
  });
});
