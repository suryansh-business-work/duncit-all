import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { VenueOfferCounterForm } from '@/forms/venue-offer-counter';
import { useVenueCounterQuote } from '@/hooks/useVenueCounterQuote';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/hooks/useVenueCounterQuote', () => ({ useVenueCounterQuote: jest.fn() }));
const mockQuote = useVenueCounterQuote as jest.Mock;

const lines = {
  base: 7000,
  rules: [],
  min_spend_top_up: 0,
  cleaning_fee: 0,
  pet_fee: 0,
  taxes: 0,
  venue_payout: 7000,
  platform_fee: 700,
  total: 7700,
  deposit: 0,
};

const mount = (
  terms: { model: string; rate: number } | null = { model: 'PER_GUEST', rate: 300 },
) => {
  const spies = { onClose: jest.fn(), onSend: jest.fn() };
  renderWithProviders(<VenueOfferCounterForm slotId="s1" terms={terms} busy={false} {...spies} />);
  return spies;
};

beforeEach(() => {
  mockQuote.mockReset();
  mockQuote.mockReturnValue({
    result: { ok: true, message: null, quote: lines },
    error: null,
    isLoading: false,
  });
});

describe('VenueOfferCounterForm', () => {
  it("starts from the terms on the table and prices the venue's as they change", () => {
    mount();
    expect(mockQuote).toHaveBeenLastCalledWith(
      's1',
      { model: 'PER_GUEST', rate: 300 },
      "We couldn't price these terms.",
    );
    fireEvent.press(screen.getByTestId('venue-offer-counter-model-FLAT'));
    fireEvent.changeText(screen.getByTestId('field-rate'), '7000');
    expect(mockQuote).toHaveBeenLastCalledWith(
      's1',
      { model: 'FLAT', rate: 7000 },
      "We couldn't price these terms.",
    );
    expect(screen.getByTestId('venue-offer-counter-lines')).toBeOnTheScreen();
  });

  it('asks the server nothing for an amount it cannot price', () => {
    mount(null);
    expect(mockQuote).toHaveBeenLastCalledWith('s1', null, "We couldn't price these terms.");
  });

  it('sends the terms and the note', async () => {
    const spies = mount();
    fireEvent.changeText(screen.getByTestId('field-note'), ' Weekend rate ');
    fireEvent.press(screen.getByTestId('venue-offer-counter-send'));
    await waitFor(() =>
      expect(spies.onSend).toHaveBeenCalledWith({ model: 'PER_GUEST', rate: 300 }, 'Weekend rate'),
    );
  });

  it('refuses an amount of 0 with the shared message', async () => {
    const spies = mount({ model: 'FLAT', rate: 0 });
    fireEvent.press(screen.getByTestId('venue-offer-counter-send'));
    expect(await screen.findByText('Enter an amount above 0')).toBeOnTheScreen();
    expect(spies.onSend).not.toHaveBeenCalled();
  });

  it('shows why the terms cannot be taken, while pricing, and when pricing fails', () => {
    mockQuote.mockReturnValue({
      result: { ok: false, message: 'This amount is too large', quote: null },
      error: null,
      isLoading: true,
    });
    mount();
    expect(screen.getByText('This amount is too large')).toBeOnTheScreen();
    expect(screen.getByText('Pricing…')).toBeOnTheScreen();
    expect(screen.queryByTestId('venue-offer-counter-lines')).toBeNull();

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
