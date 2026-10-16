import { Linking } from 'react-native';
import { fireEvent, screen, waitFor, within } from '@testing-library/react-native';
import { partnerPortalUrl } from '@duncit/onboarding';
import type { RentalItemsConfig, RentalsVenue, VenueRentalItem } from '@duncit/utils';

import { RentalItemsForm } from '@/components/venue-rentals-desk/RentalItemsForm';
import { renderWithProviders } from '@/utils/test-utils';

// The photo picker/upload has its own spec; the stand-in "uploads" one more
// photo when pressed, through the card's wiring.
jest.mock('@/components/create-pod/MediaUploadField/MediaUploadField', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Text } = require('react-native');
  return {
    MediaUploadField: ({
      value,
      onChange,
    }: {
      value: string;
      onChange: (text: string) => void;
    }) => (
      <Text testID="stub-media-upload" onPress={() => onChange(`${value}\nhttp://x/new.jpg`)}>
        {value}
      </Text>
    ),
  };
});

const CONFIG: RentalItemsConfig = {
  rental_units: ['SLOT', 'HOUR'],
  rental_item_limit: 2,
  rental_image_limit: 4,
  rental_rate_max: 50000,
  rental_deposit_max: 50000,
  rental_stock_max: 500,
  rental_per_guest_max: 20,
  rental_terms_max: 20000,
};
const ITEM: VenueRentalItem = {
  id: 'i1',
  name: 'Racket',
  description: 'Carbon frame',
  images: ['http://x/a.jpg'],
  unit: 'HOUR',
  rate: 120,
  deposit: 300,
  stock: 4,
  per_guest_limit: 2,
  is_available: true,
};
const venue = (over: Partial<RentalsVenue> = {}): RentalsVenue => ({
  id: 'v1',
  venue_name: 'Court Nine',
  status: 'APPROVED',
  offers_rentals: true,
  rental_terms_html: '<p>Return items <b>clean</b>.</p>',
  rental_deposit_gst: true,
  rental_items: [ITEM],
  ...over,
});

const renderForm = (value = venue(), onSave = jest.fn().mockResolvedValue(undefined)) => {
  renderWithProviders(<RentalItemsForm venue={value} config={CONFIG} onSave={onSave} />);
  return onSave;
};

describe('RentalItemsForm', () => {
  it('lists each item as a card with its rate, unit and units per pod', () => {
    renderForm();
    const card = screen.getByTestId('rental-item-0');
    expect(within(card).getByText('Racket')).toBeOnTheScreen();
    expect(within(card).getByText('120 per hour · 4 per pod')).toBeOnTheScreen();
    expect(within(card).getByTestId('stub-media-upload')).toHaveTextContent('http://x/a.jpg');
  });

  it('reads the venue’s terms as plain text and sends the owner to the Partner console to edit them', () => {
    const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    renderForm();
    expect(screen.getByText('Return items clean.')).toBeOnTheScreen();
    expect(
      screen.getByText('Your rental terms are written with formatting in the Partner console.'),
    ).toBeOnTheScreen();

    fireEvent.press(screen.getByTestId('rental-items-edit-terms'));
    expect(open).toHaveBeenCalledWith(
      partnerPortalUrl('/venues/rented-items?selectedtab_rentals=items'),
    );
    open.mockRestore();
  });

  it('shows the hint alone when the venue wrote no terms, and the empty note with no items', () => {
    renderForm(venue({ rental_terms_html: '', rental_items: [] }));
    expect(screen.queryByText('Return items clean.')).toBeNull();
    expect(screen.getByTestId('rental-items-empty')).toBeOnTheScreen();
  });

  it('saves the whole list — switch, terms and edited items — and says so', async () => {
    const onSave = renderForm();
    fireEvent(screen.getByTestId('rental-item-0-available-switch'), 'valueChange', false);
    fireEvent.press(screen.getByTestId('stub-media-upload'));
    fireEvent.press(screen.getByTestId('rental-items-save'));

    await waitFor(() => expect(screen.getByText('Rented items saved')).toBeOnTheScreen());
    const saved = onSave.mock.calls[0][0];
    expect(saved).toMatchObject({
      offers_rentals: true,
      rental_terms_html: '<p>Return items <b>clean</b>.</p>',
    });
    expect(saved.items[0]).toMatchObject({
      id: 'i1',
      name: 'Racket',
      unit: 'HOUR',
      rate: 120,
      stock: 4,
      is_available: false,
      images: ['http://x/a.jpg', 'http://x/new.jpg'],
    });
  });

  it('keeps everything typed and shows the refusal when the save fails', async () => {
    renderForm(venue(), jest.fn().mockRejectedValue(new Error('Venue is paused')));
    fireEvent(screen.getByTestId('rental-items-offers-switch'), 'valueChange', false);
    fireEvent.press(screen.getByTestId('rental-items-save'));

    await waitFor(() => expect(screen.getByText('Venue is paused')).toBeOnTheScreen());
    expect(screen.getByTestId('rental-item-0')).toBeOnTheScreen();
  });

  it('adds an item in a sheet, checks it against the shared rules, then lists it', async () => {
    renderForm(venue({ rental_items: [] }));
    fireEvent.press(screen.getByTestId('rental-items-add'));
    expect(screen.getByTestId('rental-item-sheet')).toBeOnTheScreen();

    // Done with nothing typed: the rules refuse it and the sheet stays.
    fireEvent.press(screen.getByTestId('rental-item-done'));
    await waitFor(() => expect(screen.getByText('Give the item a name')).toBeOnTheScreen());

    fireEvent.changeText(screen.getByTestId('field-items.0.name'), 'Shoes');
    fireEvent.press(screen.getByTestId('rental-item-unit-HOUR'));
    fireEvent.changeText(screen.getByTestId('field-items.0.rate'), '80');
    fireEvent.changeText(screen.getByTestId('field-items.0.stock'), '3');
    fireEvent.changeText(screen.getByTestId('field-items.0.per_guest_limit'), '1');
    fireEvent.press(screen.getByTestId('rental-item-done'));

    await waitFor(() => expect(screen.queryByTestId('rental-item-sheet')).toBeNull()).catch(
      (err: unknown) => {
        const texts = (JSON.stringify(screen.toJSON()).match(/"children":\["[^"]+"\]/g) ?? []).join(
          ' | ',
        );
        throw new Error(`DIAG-RENTAL-SHEET ${texts} ${String(err)}`);
      },
    );
    expect(within(screen.getByTestId('rental-item-0')).getByText('Shoes')).toBeOnTheScreen();
    expect(screen.getByText('80 per hour · 3 per pod')).toBeOnTheScreen();
  });

  it('cancelling a new item drops it, while cancelling an edit keeps the item', () => {
    renderForm();
    fireEvent.press(screen.getByTestId('rental-items-add'));
    expect(screen.getByTestId('rental-item-1')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('rental-item-cancel'));
    expect(screen.queryByTestId('rental-item-1')).toBeNull();

    fireEvent.press(screen.getByTestId('rental-item-0-edit'));
    expect(screen.getByText('Item 1')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('rental-item-cancel'));
    expect(screen.getByTestId('rental-item-0')).toBeOnTheScreen();
  });

  it('removes an item, and an unnamed item reads by its number', () => {
    renderForm(venue({ rental_items: [ITEM, { ...ITEM, id: 'i2', name: '  ' }] }));
    expect(within(screen.getByTestId('rental-item-1')).getByText('Item 2')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('rental-item-0-remove'));
    expect(screen.queryByTestId('rental-item-1')).toBeNull();
  });

  it('stops adding at the venue’s item limit', () => {
    renderForm(venue({ rental_items: [ITEM, { ...ITEM, id: 'i2' }] }));
    expect(screen.getByTestId('rental-items-add')).toBeDisabled();
  });
});
