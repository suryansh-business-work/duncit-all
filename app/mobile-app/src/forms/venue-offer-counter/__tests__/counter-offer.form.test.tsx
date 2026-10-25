import { act, fireEvent, screen } from '@testing-library/react-native';
import type { VenueOfferCounterSource } from '@duncit/forms/schemas';

import { VenueOfferCounterForm } from '@/forms/venue-offer-counter';
import { VenueOfferModel } from '@/generated/graphql/graphql';
import { useCounterQuote, type CounterQuoteTarget } from '@/hooks/useCounterQuote';
import { renderWithProviders } from '@/utils/test-utils';
import { offerQuote } from '@/utils/venue-offer-fixture';

jest.mock('@/hooks/useCounterQuote', () => ({ useCounterQuote: jest.fn() }));
const mockQuote = useCounterQuote as jest.Mock;

const VENUE: CounterQuoteTarget = { side: 'VENUE', slotId: 's1' };
const ON_TABLE: VenueOfferCounterSource = {
  model: 'PER_GUEST',
  rate: 300,
  minGuests: 8,
  offerings: ['A projector', '10 chairs'],
};

const mount = (
  over: Partial<{
    side: 'HOST' | 'VENUE';
    terms: VenueOfferCounterSource | null;
    error: string;
  }> = {},
) => {
  const spies = { onClose: jest.fn(), onSend: jest.fn() };
  renderWithProviders(
    <VenueOfferCounterForm
      side={over.side ?? 'VENUE'}
      target={VENUE}
      terms={over.terms === undefined ? ON_TABLE : over.terms}
      maxGuests={20}
      busy={false}
      error={over.error ?? null}
      {...spies}
    />,
  );
  return spies;
};

const send = async () => {
  await act(async () => {
    fireEvent.press(screen.getByTestId('venue-offer-counter-send'));
  });
};

beforeEach(() => {
  mockQuote.mockReset();
  mockQuote.mockReturnValue({
    result: {
      ok: true,
      message: null,
      quote: offerQuote(6000, 6600, 20),
      quote_min: offerQuote(2400, 2640, 8),
    },
    error: null,
    isLoading: false,
  });
});

describe('VenueOfferCounterForm', () => {
  it('starts from the terms on the table and prices them — never the points — as they change', () => {
    mount();
    expect(screen.getByText('Counter offer')).toBeOnTheScreen();
    expect(screen.getByTestId('field-min_guests')).toHaveProp('value', '8');
    expect(mockQuote).toHaveBeenLastCalledWith(
      VENUE,
      { model: VenueOfferModel.PerGuest, rate: 300, min_guests: 8 },
      "We couldn't price these terms.",
    );
    fireEvent.changeText(screen.getByTestId('field-offerings'), 'Just the hall');
    expect(mockQuote).toHaveBeenLastCalledWith(
      VENUE,
      { model: VenueOfferModel.PerGuest, rate: 300, min_guests: 8 },
      "We couldn't price these terms.",
    );
    // The price at both ends of the guests, the breakdown at the most.
    expect(screen.getByText('You receive ₹2,400 – ₹6,000')).toBeOnTheScreen();
    expect(screen.getByTestId('venue-offer-counter-priced-breakdown-at')).toHaveTextContent(
      'Breakdown at 20 guests',
    );
  });

  it('sends the terms, the minimum, the points and the trimmed note', async () => {
    const spies = mount();
    fireEvent.changeText(screen.getByTestId('field-rate'), '350');
    fireEvent.changeText(screen.getByTestId('field-min_guests'), '10');
    fireEvent.changeText(screen.getByTestId('field-note'), ' Weekend rate ');
    await send();
    expect(spies.onSend).toHaveBeenCalledWith(
      { model: 'PER_GUEST', rate: 350, min_guests: 10, offerings: ['A projector', '10 chairs'] },
      'Weekend rate',
    );
  });

  it('drops the minimum when the option is not priced per guest', async () => {
    const spies = mount();
    fireEvent.changeText(screen.getByTestId('field-min_guests'), '99');
    fireEvent.press(screen.getByTestId('venue-offer-counter-model-FLAT'));
    expect(screen.queryByTestId('field-min_guests')).toBeNull();
    fireEvent.changeText(screen.getByTestId('field-rate'), '7000');
    expect(mockQuote).toHaveBeenLastCalledWith(
      VENUE,
      { model: VenueOfferModel.Flat, rate: 7000 },
      "We couldn't price these terms.",
    );
    await send();
    expect(spies.onSend).toHaveBeenCalledWith(
      { model: 'FLAT', rate: 7000, offerings: ['A projector', '10 chairs'] },
      '',
    );
    // Back on a per-guest price, an empty minimum keeps the one on the table.
    fireEvent.press(screen.getByTestId('venue-offer-counter-model-PER_GUEST'));
    expect(screen.getByTestId('field-min_guests')).toHaveProp('value', '');
  });

  it('refuses a minimum above the booking’s guests, and an amount of 0', async () => {
    const spies = mount();
    fireEvent.changeText(screen.getByTestId('field-min_guests'), '25');
    fireEvent.changeText(screen.getByTestId('field-rate'), '0');
    await send();
    expect(
      screen.getByText('Enter the fewest guests as a whole number from 1 to 20'),
    ).toBeOnTheScreen();
    expect(screen.getByText('Enter an amount above 0')).toBeOnTheScreen();
    expect(spies.onSend).not.toHaveBeenCalled();
    // Nothing usable is priced.
    expect(mockQuote).toHaveBeenLastCalledWith(VENUE, null, "We couldn't price these terms.");
  });

  it("words the host's counter-back and shows the server's refusal", () => {
    mount({ side: 'HOST', terms: null, error: 'The offer expired' });
    expect(screen.getByText('Counter the venue')).toBeOnTheScreen();
    expect(screen.getByText('Note to the venue (optional)')).toBeOnTheScreen();
    expect(screen.getByTestId('venue-offer-counter-error')).toHaveTextContent('The offer expired');
    // No terms on the table: a flat price with nothing typed yet.
    expect(screen.queryByTestId('field-min_guests')).toBeNull();
    expect(screen.getByText('Costs the pod ₹2,640 – ₹6,600, with Duncit’s fee')).toBeOnTheScreen();
  });

  it('shows why the terms cannot be taken, while pricing, and when pricing fails', () => {
    mockQuote.mockReturnValue({
      result: { ok: false, message: 'This amount is too large', quote: null, quote_min: null },
      error: null,
      isLoading: true,
    });
    mount();
    expect(screen.getByText('This amount is too large')).toBeOnTheScreen();
    expect(screen.getByText('Pricing…')).toBeOnTheScreen();
    expect(screen.queryByTestId('venue-offer-counter-priced')).toBeNull();

    mockQuote.mockReturnValue({ result: null, error: 'down', isLoading: false });
    fireEvent.changeText(screen.getByTestId('field-rate'), '500');
    expect(screen.getByText('down')).toBeOnTheScreen();
  });

  it('closes without sending', () => {
    const spies = mount();
    fireEvent.press(screen.getByTestId('venue-offer-counter-cancel'));
    expect(spies.onClose).toHaveBeenCalled();
    expect(spies.onSend).not.toHaveBeenCalled();
  });
});
