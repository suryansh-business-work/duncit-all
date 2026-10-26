import { act, fireEvent, screen, waitFor, within } from '@testing-library/react-native';
import * as ImagePicker from 'expo-image-picker';
import type { VenueOfferCounterSource } from '@duncit/forms/schemas';

import { VenueOfferCounterForm } from '@/forms/venue-offer-counter';
import { VenueOfferModel } from '@/generated/graphql/graphql';
import { uploadChatImage } from '@/hooks/useChatRoom';
import { useCounterQuote, type CounterQuoteTarget } from '@/hooks/useCounterQuote';
import { renderWithProviders } from '@/utils/test-utils';
import { offerQuote } from '@/utils/venue-offer-fixture';

jest.mock('@/hooks/useCounterQuote', () => ({ useCounterQuote: jest.fn() }));
jest.mock('@/hooks/useChatRoom', () => ({ uploadChatImage: jest.fn() }));
jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
}));
const mockQuote = useCounterQuote as jest.Mock;
const mockUpload = uploadChatImage as jest.Mock;
const mockPermission = ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock;
const mockLibrary = ImagePicker.launchImageLibraryAsync as jest.Mock;
const PHOTO = 'https://ik.imagekit.io/duncit/chat/setup.jpg';

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
    terms: (VenueOfferCounterSource & { note?: string; images?: string[] }) | null;
    error: string;
    edit: boolean;
    target: CounterQuoteTarget;
  }> = {},
) => {
  const spies = { onClose: jest.fn(), onSend: jest.fn() };
  renderWithProviders(
    <VenueOfferCounterForm
      side={over.side ?? 'VENUE'}
      edit={over.edit}
      target={over.target ?? VENUE}
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
  mockUpload.mockReset();
  mockPermission.mockReset();
  mockLibrary.mockReset();
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

describe('VenueOfferCounterForm — photos', () => {
  it('attaches photos picked from the device, uploaded as they land, and sends them with the terms', async () => {
    mockPermission.mockResolvedValue({ granted: true });
    mockLibrary.mockResolvedValue({
      canceled: false,
      assets: [{ base64: 'AAA', fileName: 'setup.jpg', mimeType: 'image/jpeg' }],
    });
    mockUpload.mockResolvedValue(PHOTO);
    const spies = mount();
    expect(screen.getByTestId('venue-offer-counter-images-hint')).toHaveTextContent(
      'Up to 4 photos from your device, for example the set-up or the menu.',
    );
    await act(async () => {
      fireEvent.press(screen.getByTestId('venue-offer-counter-image-add'));
    });
    // Photos only — never a video — and no more than the four allowed.
    expect(mockLibrary).toHaveBeenCalledWith(
      expect.objectContaining({ mediaTypes: ['images'], selectionLimit: 4 }),
    );
    expect(mockUpload).toHaveBeenCalledWith({
      base64: 'AAA',
      fileName: 'setup.jpg',
      mimeType: 'image/jpeg',
    });
    await waitFor(() =>
      expect(
        within(screen.getByTestId('venue-offer-counter-image')).getByLabelText('Open photo 1'),
      ).toBeOnTheScreen(),
    );
    await send();
    expect(spies.onSend).toHaveBeenCalledWith(expect.objectContaining({ images: [PHOTO] }), '');
  });

  it('removes a photo, and says when photo access is refused', async () => {
    mockPermission.mockResolvedValue({ granted: false });
    const spies = mount({ terms: { ...ON_TABLE, note: '', images: [PHOTO] }, edit: true });
    fireEvent.press(screen.getByTestId('venue-offer-counter-image-remove-0'));
    expect(screen.queryByTestId('venue-offer-counter-image')).toBeNull();
    await act(async () => {
      fireEvent.press(screen.getByTestId('venue-offer-counter-image-add'));
    });
    expect(screen.getByTestId('venue-offer-counter-images-hint')).toHaveTextContent(
      'Photo access is needed to send an image.',
    );
    expect(mockLibrary).not.toHaveBeenCalled();
    await send();
    expect(spies.onSend.mock.calls[0]?.[0]).not.toHaveProperty('images');
  });

  it('keeps the photos that landed and says why the next upload failed', async () => {
    mockPermission.mockResolvedValue({ granted: true });
    mockLibrary.mockResolvedValue({
      canceled: false,
      assets: [
        { base64: 'AAA', fileName: 'a.jpg', mimeType: 'image/jpeg' },
        { base64: 'BBB', fileName: 'b.jpg', mimeType: 'image/jpeg' },
      ],
    });
    mockUpload.mockResolvedValueOnce(PHOTO).mockRejectedValueOnce(new Error('Upload failed'));
    mount();
    await act(async () => {
      fireEvent.press(screen.getByTestId('venue-offer-counter-image-add'));
    });
    await waitFor(() =>
      expect(screen.getByTestId('venue-offer-counter-images-hint')).toHaveTextContent(
        'Upload failed',
      ),
    );
    const attached = screen.getByTestId('venue-offer-counter-image');
    expect(within(attached).getByLabelText('Open photo 1')).toBeOnTheScreen();
    expect(within(attached).queryByLabelText('Open photo 2')).toBeNull();
  });

  it('offers no more photos once four are attached', () => {
    const four = ['a', 'b', 'c', 'd'].map((n) => `https://ik.imagekit.io/duncit/chat/${n}.jpg`);
    mount({ terms: { ...ON_TABLE, note: '', images: four }, edit: true });
    expect(screen.queryByTestId('venue-offer-counter-image-add')).toBeNull();
  });
});

describe('VenueOfferCounterForm — editing one’s own counter', () => {
  it('starts from the counter whole — its note and photos — prices it as an edit and saves it', async () => {
    const EDIT: CounterQuoteTarget = { side: 'EDIT', podId: 'pod-1' };
    const spies = mount({
      edit: true,
      target: EDIT,
      terms: { ...ON_TABLE, note: 'Weekend rate', images: [PHOTO] },
    });
    expect(screen.getByText('Edit your counter')).toBeOnTheScreen();
    expect(screen.getByTestId('venue-offer-counter-send')).toHaveTextContent('Save changes');
    expect(screen.getByTestId('field-note')).toHaveProp('value', 'Weekend rate');
    expect(mockQuote).toHaveBeenLastCalledWith(
      EDIT,
      { model: VenueOfferModel.PerGuest, rate: 300, min_guests: 8 },
      "We couldn't price these terms.",
    );
    await send();
    expect(spies.onSend).toHaveBeenCalledWith(
      {
        model: 'PER_GUEST',
        rate: 300,
        min_guests: 8,
        offerings: ['A projector', '10 chairs'],
        images: [PHOTO],
      },
      'Weekend rate',
    );
  });
});
