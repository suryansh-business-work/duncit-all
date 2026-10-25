import { screen, within } from '@testing-library/react-native';

import { OfferTermsPanel } from '@/components/venue-offer/OfferTermsPanel';
import { VenueOfferModel, VenueOfferParty, VenueOfferStatus } from '@/generated/graphql/graphql';
import { renderWithProviders } from '@/utils/test-utils';
import { counteredOffer, offerQuote, offerTerms } from '@/utils/venue-offer-fixture';

describe('OfferTermsPanel — the venue reading a host offer', () => {
  it("shows the host's terms, the money as a range, the ask and the answer-by", () => {
    renderWithProviders(<OfferTermsPanel offer={offerTerms()} podIsFree={false} side="VENUE" />);
    expect(screen.getByText('Host offered')).toBeOnTheScreen();
    expect(screen.getByTestId('offer-terms-line')).toHaveTextContent('Per guest · ₹300 per guest');
    expect(screen.getByTestId('offer-status')).toHaveTextContent('Waiting for your answer');
    expect(screen.getByText('You receive ₹2,400 – ₹6,000')).toBeOnTheScreen();
    expect(screen.getByText('The host pays ₹2,640 – ₹6,600, with Duncit’s fee')).toBeOnTheScreen();
    // The breakdown below the range is the one at the most guests.
    expect(screen.getByTestId('offer-terms-slot-1-quote-breakdown-at')).toHaveTextContent(
      'Breakdown at 20 guests',
    );
    expect(screen.getByTestId('offer-terms-slot-1-quote-lines')).toBeOnTheScreen();
    const ask = screen.getByTestId('offer-ask');
    expect(within(ask).getByText('A projector')).toBeOnTheScreen();
    expect(within(ask).getByText('10 chairs')).toBeOnTheScreen();
    expect(within(ask).getByText('Note from the host')).toBeOnTheScreen();
    expect(within(ask).getByText('We bring our own snacks')).toBeOnTheScreen();
    expect(screen.getByTestId('offer-answer-by')).toHaveTextContent(/^Answer by /);
  });

  it('reads its own counter as "Your counter", with the venue note, and one amount when both ends agree', () => {
    const flat = offerQuote(7000, 7700, 20);
    const offer = counteredOffer({
      counter: {
        model: VenueOfferModel.Flat,
        rate: 7000,
        min_guests: 0,
        offerings: [],
        note: 'Weekend rate',
        at: null,
        quote: flat,
        quote_min: flat,
      },
    });
    renderWithProviders(<OfferTermsPanel offer={offer} podIsFree={false} side="VENUE" />);
    expect(screen.getByText('Your counter')).toBeOnTheScreen();
    expect(screen.getByTestId('offer-terms-line')).toHaveTextContent('Flat price · ₹7,000 flat');
    expect(screen.getByTestId('offer-status')).toHaveTextContent(
      'You countered — waiting for the host',
    );
    expect(screen.getByText('You receive ₹7,000')).toBeOnTheScreen();
    expect(screen.queryByTestId('offer-terms-slot-1-quote-breakdown-at')).toBeNull();
    expect(screen.getByText('Note from the venue')).toBeOnTheScreen();
    expect(screen.queryByText('A projector')).toBeNull();
  });

  it('quotes nothing for a free pod and shows no answer-by once the offer is closed', () => {
    const offer = offerTerms({
      status: VenueOfferStatus.Accepted,
      awaiting: null,
      offerings: [],
      note: '',
    });
    renderWithProviders(<OfferTermsPanel offer={offer} podIsFree side="VENUE" />);
    expect(screen.getByTestId('offer-free-pod')).toHaveTextContent(
      'Free pod: the host settles your charges with you directly, so no amount is quoted here.',
    );
    expect(screen.queryByTestId('offer-money')).toBeNull();
    expect(screen.queryByTestId('offer-ask')).toBeNull();
    expect(screen.queryByTestId('offer-answer-by')).toBeNull();
    expect(screen.getByTestId('offer-status')).toHaveTextContent('Accepted');
  });
});

describe('OfferTermsPanel — the host reading their pod', () => {
  it("reads the venue's counter as the host's move, priced as what it costs the pod", () => {
    renderWithProviders(<OfferTermsPanel offer={counteredOffer()} podIsFree={false} side="HOST" />);
    expect(screen.getByText("The venue's counter")).toBeOnTheScreen();
    expect(screen.getByTestId('offer-terms-line')).toHaveTextContent('Per guest · ₹350 per guest');
    expect(screen.getByTestId('offer-status')).toHaveTextContent(
      'The venue countered — your answer',
    );
    expect(screen.getByText('Costs the pod ₹3,850 – ₹7,700, with Duncit’s fee')).toBeOnTheScreen();
    expect(screen.getByText('The venue receives ₹3,500 – ₹7,000')).toBeOnTheScreen();
    expect(screen.getByText('Note from the venue')).toBeOnTheScreen();
  });

  it.each([
    [VenueOfferStatus.Sent, 'Waiting for the venue to answer'],
    [VenueOfferStatus.Accepted, 'Accepted'],
    [VenueOfferStatus.Declined, 'Declined'],
  ])('names a %s offer in the host’s words', (status, label) => {
    renderWithProviders(
      <OfferTermsPanel
        offer={offerTerms({ status, awaiting: VenueOfferParty.Venue })}
        podIsFree={false}
        side="HOST"
      />,
    );
    expect(screen.getByText('Your offer')).toBeOnTheScreen();
    expect(screen.getByTestId('offer-status')).toHaveTextContent(label);
  });

  it('shows no status for one this build does not know, and the free-pod note for a free pod', () => {
    const offer = { ...offerTerms(), status: 'WITHDRAWN' as VenueOfferStatus, expires_at: null };
    renderWithProviders(<OfferTermsPanel offer={offer} podIsFree side="HOST" />);
    expect(screen.queryByTestId('offer-status')).toBeNull();
    expect(screen.getByTestId('offer-free-pod')).toHaveTextContent(
      "Free pod: you settle the venue's charges with it directly, so no amount is quoted here.",
    );
  });

  it('reads a repeated point once', () => {
    renderWithProviders(
      <OfferTermsPanel
        offer={offerTerms({ offerings: ['Chairs', 'Chairs'], note: '' })}
        podIsFree={false}
        side="HOST"
      />,
    );
    expect(screen.getAllByText('Chairs')).toHaveLength(1);
    expect(screen.queryByTestId('offer-ask-note')).toBeNull();
  });
});
