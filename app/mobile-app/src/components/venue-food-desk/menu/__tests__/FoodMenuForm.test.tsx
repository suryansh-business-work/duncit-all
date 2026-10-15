import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import {
  blankFoodLicences,
  type FoodMenuConfig,
  type FoodMenuVenue,
  type VenueFoodItem,
} from '@duncit/utils';

import { FoodMenuForm } from '@/components/venue-food-desk/menu/FoodMenuForm';
import { foodMenuTextValues } from '@/components/venue-food-desk/menu/foodMenuText';
import { saveFoodMenu } from '@/services/venue-food-menu';
import { renderWithProviders } from '@/utils/test-utils';

// Finance's currency, the save request, the sticker request, the photo upload
// and the ordering block are all outside what this spec checks: that the menu
// form hands the licences, the tables and the price preview their wiring.
jest.mock('@/hooks/usePublicFinance', () => ({
  usePublicFinance: () => ({ currency: '$', gstPct: 0 }),
}));
jest.mock('@/services/venue-food-menu', () => ({ saveFoodMenu: jest.fn() }));
jest.mock('@/components/public-page/publicPageRequests', () => ({
  fetchTableStickersBase64: jest.fn(),
  shareBase64File: jest.fn(),
}));
jest.mock('@/components/create-pod/MediaUploadField', () => ({ MediaUploadField: () => null }));
jest.mock('@/components/venue-food-desk/menu/FoodMenuOrdering', () => ({
  FoodMenuOrdering: () => null,
}));

const CONFIG: FoodMenuConfig = {
  food_diets: ['VEG', 'NON_VEG'],
  food_spice_levels: ['NONE', 'MILD'],
  food_menu_limit: 10,
  food_image_limit: 4,
  food_price_max: 10000,
  food_discount_max_pct: 50,
  food_video_limit: 2,
  food_table_limit: 20,
};

const DISH: VenueFoodItem = {
  id: 'd1',
  name: 'Paneer Tikka',
  description: '',
  category: 'Starters',
  price: 80,
  images: [],
  diet: 'VEG',
  spice_level: 'MILD',
  is_available: true,
  original_price: 100,
  saving_display: 'AMOUNT',
};

const venue = (over: Partial<FoodMenuVenue> = {}): FoodMenuVenue => ({
  id: 'v1',
  venue_name: 'Sunset Cafe',
  status: 'APPROVED',
  offers_food: true,
  food_menu: [DISH],
  food_licences: { ...blankFoodLicences, fssai_number: '12345678901234' },
  food_tables: ['1', '2'],
  ...over,
});

const stickers = () => screen.getByTestId('food-menu-table-stickers');

describe('FoodMenuForm', () => {
  it('shows the licences, the dish price preview in Finance currency, and the saved tables', () => {
    renderWithProviders(<FoodMenuForm venue={venue()} config={CONFIG} onSaved={jest.fn()} />);

    expect(screen.getByTestId('food-menu-licences')).toBeOnTheScreen();
    expect(screen.getByTestId('field-food_licences.fssai_number')).toHaveProp(
      'value',
      '12345678901234',
    );
    expect(screen.getByTestId('food-item-price-dish-0')).toHaveTextContent('$80');
    expect(screen.getByTestId('food-item-original-price-dish-0')).toHaveTextContent('$100');
    expect(screen.getByTestId('food-item-saving-dish-0')).toHaveTextContent('$20 off');
    expect(screen.getByTestId('field-food_tables')).toHaveProp('value', '1, 2');
    expect(stickers().props['aria-disabled']).toBe(false);
  });

  it('holds the stickers while the venue has no saved tables', () => {
    const { rerender } = renderWithProviders(
      <FoodMenuForm venue={venue({ food_tables: [] })} config={CONFIG} onSaved={jest.fn()} />,
    );
    expect(stickers().props['aria-disabled']).toBe(true);

    rerender(
      <FoodMenuForm venue={venue({ food_tables: null })} config={CONFIG} onSaved={jest.fn()} />,
    );
    expect(stickers().props['aria-disabled']).toBe(true);
  });

  it('hides the licences and tables while the venue serves no food', () => {
    renderWithProviders(
      <FoodMenuForm venue={venue({ offers_food: false })} config={CONFIG} onSaved={jest.fn()} />,
    );
    expect(screen.queryByTestId('food-menu-licences')).toBeNull();
    expect(screen.queryByTestId('food-menu-tables')).toBeNull();
  });

  it("opens the dish's MRP as the text the input edits", () => {
    renderWithProviders(<FoodMenuForm venue={venue()} config={CONFIG} onSaved={jest.fn()} />);

    fireEvent.press(screen.getByTestId('food-dish-0-edit'));
    expect(screen.getByTestId('field-food_menu.0.original_price')).toHaveProp('value', '100');
    expect(screen.getByTestId('food-dish-saving-display-AMOUNT')).toHaveProp('aria-checked', true);
  });

  it('adds a blank dish in the sheet and drops it again when the new dish is cancelled', () => {
    renderWithProviders(<FoodMenuForm venue={venue()} config={CONFIG} onSaved={jest.fn()} />);

    fireEvent.press(screen.getByTestId('food-menu-add'));
    expect(screen.getByTestId('food-dish-sheet-title')).toHaveTextContent('Menu item 2');
    expect(screen.getByTestId('food-dish-1')).toBeOnTheScreen();
    expect(screen.getByTestId('field-food_menu.1.name')).toHaveProp('value', '');

    fireEvent.press(screen.getByTestId('food-dish-cancel'));
    expect(screen.queryByTestId('food-dish-sheet')).toBeNull();
    expect(screen.queryByTestId('food-dish-1')).toBeNull();
    expect(screen.getByTestId('food-dish-0')).toBeOnTheScreen();
  });

  it('keeps a listed dish when its sheet is cancelled', () => {
    renderWithProviders(<FoodMenuForm venue={venue()} config={CONFIG} onSaved={jest.fn()} />);

    fireEvent.press(screen.getByTestId('food-dish-0-edit'));
    fireEvent.press(screen.getByTestId('food-dish-cancel'));

    expect(screen.queryByTestId('food-dish-sheet')).toBeNull();
    expect(screen.getByTestId('food-dish-0')).toBeOnTheScreen();
  });

  it('removes a dish and shows the empty menu note', () => {
    renderWithProviders(<FoodMenuForm venue={venue()} config={CONFIG} onSaved={jest.fn()} />);
    expect(screen.queryByTestId('food-menu-empty')).toBeNull();

    fireEvent.press(screen.getByTestId('food-dish-0-remove'));

    expect(screen.queryByTestId('food-dish-0')).toBeNull();
    expect(screen.getByTestId('food-menu-empty')).toHaveTextContent('No menu items yet.');
  });

  it('holds the add button and names the cap once the menu is full', () => {
    renderWithProviders(
      <FoodMenuForm
        venue={venue()}
        config={{ ...CONFIG, food_menu_limit: 1 }}
        onSaved={jest.fn()}
      />,
    );

    expect(screen.getByText('A menu can list at most 1 items.')).toBeOnTheScreen();
    expect(screen.getByTestId('food-menu-add').props['aria-disabled']).toBe(true);
  });

  it("saves the owner's menu without the account, then shows the server's copy", async () => {
    const onSaved = jest.fn();
    const saved = venue({ food_tables: ['1', '2', 'Patio'] });
    jest.mocked(saveFoodMenu).mockResolvedValueOnce(saved);
    renderWithProviders(<FoodMenuForm venue={venue()} config={CONFIG} onSaved={onSaved} />);

    fireEvent.press(screen.getByTestId('food-menu-save'));

    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(saved));
    expect(saveFoodMenu).toHaveBeenCalledWith('v1', {
      offers_food: true,
      food_menu: [
        {
          id: 'd1',
          name: 'Paneer Tikka',
          description: '',
          category: 'Starters',
          price: 80,
          images: [],
          diet: 'VEG',
          spice_level: 'MILD',
          is_available: true,
          videos: [],
          original_price: 100,
          saving_display: 'AMOUNT',
        },
      ],
      food_ordering: { enabled: false, discount_pct: 0, tax_override: false },
      food_licences: { ...blankFoodLicences, fssai_number: '12345678901234' },
      food_tables: ['1', '2'],
    });
    const notice = screen.getByTestId('food-menu-notice');
    expect(notice).toHaveTextContent('Food menu saved');
    expect(notice).toHaveProp('role', 'status');
    expect(screen.getByTestId('field-food_tables')).toHaveProp('value', '1, 2, Patio');
  });

  it('keeps what was typed and shows the refusal when the save fails', async () => {
    const onSaved = jest.fn();
    jest.mocked(saveFoodMenu).mockRejectedValueOnce(new Error('Venue is not approved'));
    renderWithProviders(<FoodMenuForm venue={venue()} config={CONFIG} onSaved={onSaved} />);

    fireEvent.press(screen.getByTestId('food-menu-save'));

    const notice = await screen.findByTestId('food-menu-notice');
    expect(notice).toHaveTextContent('Venue is not approved');
    expect(notice).toHaveProp('role', 'alert');
    expect(onSaved).not.toHaveBeenCalled();
    expect(screen.getByTestId('food-dish-0')).toBeOnTheScreen();
    expect(screen.getByTestId('food-menu-save').props['aria-disabled']).toBe(false);
  });
});

describe('foodMenuTextValues', () => {
  it('turns every dish price and MRP into input text, a missing MRP into an empty box', () => {
    const values = foodMenuTextValues(
      venue({ food_menu: [DISH, { ...DISH, id: 'd2', price: 45.5, original_price: null }] }),
    );

    expect(values.food_menu.map((dish) => [dish.price, dish.original_price])).toEqual([
      ['80', '100'],
      ['45.5', ''],
    ]);
  });
});
