import { Linking } from 'react-native';
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react-native';
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

// The admin category tree: one Super → Category → Sub chain, the way the cascade reads it.
jest.mock('@/hooks/useCategoryLevel', () => ({
  useCategoryLevel: (level: string, _parent: string, enabled: boolean) => {
    if (!enabled) return { options: [] };
    const byLevel: Record<string, { id: string; name: string; level: string }[]> = {
      SUPER: [{ id: 's1', name: 'Sports', level: 'SUPER' }],
      CATEGORY: [{ id: 'c1', name: 'Racquet', level: 'CATEGORY' }],
      SUB: [{ id: 'b1', name: 'Badminton', level: 'SUB' }],
    };
    return { options: byLevel[level] };
  },
}));

const CONFIG: RentalItemsConfig = {
  rental_units: ['SLOT', 'HOUR'],
  rental_item_limit: 2,
  rental_image_limit: 4,
  rental_rate_max: 50000,
  rental_deposit_max: 50000,
  rental_stock_max: 500,
  rental_per_guest_max: 20,
  rental_terms_max: 20000,
  rental_category_limit: 5,
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
  categories: [
    {
      super_category_id: 's1',
      category_id: 'c1',
      sub_category_id: 'b1',
      super_category_name: 'Sports',
      category_name: 'Racquet',
      sub_category_name: 'Badminton',
    },
  ],
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
    // The pods it is offered on, by name.
    expect(within(card).getByTestId('rental-item-0-category-summary')).toHaveTextContent(
      'Sports › Racquet › Badminton',
    );
  });

  it('warns on a card whose item names no category yet, since no pod can show it', () => {
    renderForm(venue({ rental_items: [{ ...ITEM, categories: [] }] }));
    expect(screen.getByTestId('rental-item-0-category-summary')).toHaveTextContent(
      'No category yet: guests cannot see this item',
    );
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
      categories: [expect.objectContaining({ super_id: 's1', category_id: 'c1', sub_id: 'b1' })],
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
    // Without a category no pod could show it: the rules refuse it and the sheet stays.
    await act(async () => {
      fireEvent.press(screen.getByTestId('rental-item-done'));
    });
    expect(
      screen.getByText('Pick the super category, category and sub category'),
    ).toBeOnTheScreen();
    expect(screen.getByTestId('rental-item-sheet')).toBeOnTheScreen();
    // The chain unlocks level by level: Super, then Category, then Sub.
    fireEvent.press(screen.getByTestId('rental-item-0-category-0-super_category_id-s1'));
    fireEvent.press(screen.getByTestId('rental-item-0-category-0-category_id-c1'));
    fireEvent.press(screen.getByTestId('rental-item-0-category-0-sub_category_id-b1'));
    // Done validates asynchronously, then closes the sheet — flush that inside act.
    await act(async () => {
      fireEvent.press(screen.getByTestId('rental-item-done'));
    });

    await waitFor(() => expect(screen.queryByTestId('rental-item-sheet')).toBeNull());
    expect(within(screen.getByTestId('rental-item-0')).getByText('Shoes')).toBeOnTheScreen();
    expect(screen.getByText('80 per hour · 3 per pod')).toBeOnTheScreen();
    expect(screen.getByTestId('rental-item-0-category-summary')).toHaveTextContent(
      'Sports › Racquet › Badminton',
    );
  });

  it('offers an item under several categories, removes one, and stops at the cap', () => {
    renderForm();
    fireEvent.press(screen.getByTestId('rental-item-0-edit'));
    // A single row cannot be removed: an item needs at least one.
    expect(screen.queryByTestId('rental-item-0-category-0-remove')).toBeNull();
    for (let added = 1; added < CONFIG.rental_category_limit; added += 1) {
      fireEvent.press(screen.getByTestId('rental-item-0-category-add'));
    }
    expect(screen.getByTestId('rental-item-0-category-add')).toBeDisabled();
    expect(screen.getByText('That is the most categories one item can have')).toBeOnTheScreen();

    fireEvent.press(screen.getByTestId('rental-item-0-category-4-remove'));
    expect(screen.queryByTestId('rental-item-0-category-4-remove')).toBeNull();
    expect(screen.getByTestId('rental-item-0-category-add')).not.toBeDisabled();
  });

  it('refuses the same sub category twice on one item', async () => {
    renderForm();
    fireEvent.press(screen.getByTestId('rental-item-0-edit'));
    fireEvent.press(screen.getByTestId('rental-item-0-category-add'));
    fireEvent.press(screen.getByTestId('rental-item-0-category-1-super_category_id-s1'));
    fireEvent.press(screen.getByTestId('rental-item-0-category-1-category_id-c1'));
    fireEvent.press(screen.getByTestId('rental-item-0-category-1-sub_category_id-b1'));
    await act(async () => {
      fireEvent.press(screen.getByTestId('rental-item-done'));
    });
    expect(screen.getByTestId('rental-item-0-categories-error')).toHaveTextContent(
      'This sub category is already listed',
    );
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
