import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';

import { HostOfferActions } from '@/components/venue-offer/HostOfferActions';
import type { OfferTerms } from '@/components/venue-offer/offer-format';
import type { HostOfferAnswers } from '@/hooks/usePodVenueOffer';
import { renderWithProviders } from '@/utils/test-utils';
import { counteredOffer, hostAnswersApi, offerTerms } from '@/utils/venue-offer-fixture';

const mockQuote = jest.fn((..._args: unknown[]) => ({
  result: null,
  error: null,
  isLoading: false,
}));
jest.mock('@/hooks/useCounterQuote', () => ({
  useCounterQuote: (...args: unknown[]) => mockQuote(...args),
}));

const mount = (offer: OfferTerms, answers: HostOfferAnswers = hostAnswersApi()) => {
  renderWithProviders(
    <HostOfferActions
      podId="pod-1"
      offer={offer}
      podTitle="Sunday Badminton"
      venueName="Court House"
      answers={answers}
    />,
  );
  return answers;
};

const confirm = async () => {
  await act(async () => {
    fireEvent.press(screen.getByTestId('offer-answer-confirm'));
  });
};

describe('HostOfferActions', () => {
  it("offers nothing while the host's own offer waits on the venue", () => {
    mount(offerTerms());
    expect(screen.queryByTestId('host-offer-accept')).toBeNull();
    expect(screen.queryByTestId('host-offer-counter')).toBeNull();
  });

  it("accepts the venue's counter for the round read, naming what the venue receives", async () => {
    const answers = mount(counteredOffer());
    fireEvent.press(screen.getByTestId('host-offer-accept'));
    expect(screen.getByText("Accept the venue's terms?")).toBeOnTheScreen();
    expect(screen.getByText(/The venue receives ₹3,500 – ₹7,000\.$/)).toBeOnTheScreen();
    await confirm();
    expect(answers.accept).toHaveBeenCalledWith(2);
    await waitFor(() => expect(screen.queryByTestId('offer-answer-sheet')).toBeNull());
  });

  it('rejects with a reason for the venue', async () => {
    const answers = mount(counteredOffer());
    fireEvent.press(screen.getByTestId('host-offer-reject'));
    expect(screen.getByText('Reason for the venue (optional)')).toBeOnTheScreen();
    fireEvent.changeText(screen.getByTestId('field-reason'), 'Too dear');
    await confirm();
    expect(answers.reject).toHaveBeenCalledWith('Too dear', 2);
  });

  it('refuses a reason longer than the venue is shown', async () => {
    const answers = mount(counteredOffer());
    fireEvent.press(screen.getByTestId('host-offer-reject'));
    fireEvent.changeText(screen.getByTestId('field-reason'), 'x'.repeat(281));
    await confirm();
    expect(await screen.findByText('Keep the note under 280 characters')).toBeOnTheScreen();
    expect(answers.reject).not.toHaveBeenCalled();
  });

  it("counters back from the venue's terms, priced for the pod, and keeps the sheet open when refused", async () => {
    const answers = mount(counteredOffer(), hostAnswersApi({ error: 'Offer expired' }, false));
    fireEvent.press(screen.getByTestId('host-offer-counter'));
    expect(screen.getByText('Counter the venue')).toBeOnTheScreen();
    expect(screen.getByText('Note to the venue (optional)')).toBeOnTheScreen();
    expect(mockQuote).toHaveBeenLastCalledWith(
      { side: 'HOST', podId: 'pod-1' },
      expect.objectContaining({ rate: 350, min_guests: 10 }),
      "We couldn't price these terms.",
    );
    fireEvent.changeText(screen.getByTestId('field-note'), ' Can do 320? ');
    await act(async () => {
      fireEvent.press(screen.getByTestId('venue-offer-counter-send'));
    });
    expect(answers.counter).toHaveBeenCalledWith(
      { model: 'PER_GUEST', rate: 350, min_guests: 10, offerings: ['A projector'] },
      'Can do 320?',
      2,
    );
    expect(screen.getByTestId('venue-offer-counter-error')).toHaveTextContent('Offer expired');
  });
});

describe('HostOfferActions — the counters each side may make', () => {
  it('names how many counters the host has left beside Counter', () => {
    mount(counteredOffer({ host_counters_used: 1 }));
    expect(screen.getByTestId('host-offer-counter')).toBeOnTheScreen();
    expect(screen.getByTestId('host-offer-counters-left')).toHaveTextContent(
      '2 of 3 counters left',
    );
  });

  it('hides Counter once the host has used their share, leaving accept or reject', () => {
    mount(counteredOffer({ host_counters_used: 3 }));
    expect(screen.queryByTestId('host-offer-counter')).toBeNull();
    expect(screen.getByTestId('host-offer-accept')).toBeOnTheScreen();
    expect(screen.getByTestId('host-offer-reject')).toBeOnTheScreen();
    expect(screen.getByTestId('host-offer-counters-left')).toHaveTextContent(
      'You have used all your counters — accept or reject',
    );
  });
});
