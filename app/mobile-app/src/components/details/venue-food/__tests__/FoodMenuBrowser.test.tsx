import { fireEvent, screen } from '@testing-library/react-native';
import { groupFoodMenu, type VenueFoodItem } from '@duncit/utils';

import { FoodMenuBrowser } from '@/components/details/venue-food/FoodMenuBrowser';
import { renderWithProviders } from '@/utils/test-utils';

const dish = (over: Partial<VenueFoodItem> = {}): VenueFoodItem => ({
  id: 'chai',
  name: 'Masala Chai',
  description: '',
  category: 'Drinks',
  price: 120,
  images: [],
  diet: 'VEG',
  spice_level: 'NONE',
  is_available: true,
  ...over,
});

const MENU = [
  dish(),
  dish({ id: 'lassi', name: 'Sweet Lassi', description: 'Chilled yoghurt' }),
  dish({ id: 'samosa', name: 'Samosa', category: 'Snacks' }),
  dish({ id: 'bread', name: 'Garlic Bread', category: '' }),
];

const onOpenDetails = jest.fn();
const onQuantity = jest.fn();

function renderBrowser(menu: VenueFoodItem[] = MENU) {
  return renderWithProviders(
    <FoodMenuBrowser
      groups={groupFoodMenu(menu)}
      currency="₹"
      onOpenDetails={onOpenDetails}
      canOrder
      quantityOf={(id) => (id === 'samosa' ? 2 : 0)}
      cartReady
      onQuantity={onQuantity}
    />,
  );
}

const section = (index: number) => screen.getByTestId(`food-menu-section-${index}`);
const shownDishes = () => screen.queryAllByTestId(/^food-item-open-/).map((n) => n.props.testID);

beforeEach(() => jest.clearAllMocks());

describe('FoodMenuBrowser — sections', () => {
  it('heads each category with its dish count, and puts the loose dishes under "More dishes"', () => {
    renderBrowser();
    expect(section(0)).toHaveTextContent(/Drinks/);
    expect(section(0)).toHaveTextContent(/2 items/);
    expect(section(1)).toHaveTextContent(/Snacks/);
    expect(section(2)).toHaveTextContent(/More dishes/);
    expect(section(0).props['aria-expanded']).toBe(true);
    expect(shownDishes()).toHaveLength(4);
  });

  it('folds and reopens one section from its heading', () => {
    renderBrowser();
    fireEvent.press(section(0));
    expect(section(0).props['aria-expanded']).toBe(false);
    expect(screen.queryByTestId('food-item-open-chai')).toBeNull();
    expect(screen.queryByTestId('food-item-open-lassi')).toBeNull();
    expect(screen.getByTestId('food-item-open-samosa')).toBeOnTheScreen();
    // Not every section is open any more: the button offers to open them all.
    expect(screen.getByTestId('venue-food-toggle-all')).toHaveTextContent(/Expand all/);

    fireEvent.press(section(0));
    expect(section(0).props['aria-expanded']).toBe(true);
    expect(screen.getByTestId('food-item-open-chai')).toBeOnTheScreen();
    expect(screen.getByTestId('venue-food-toggle-all')).toHaveTextContent(/Collapse all/);
  });

  it('folds every section, then opens every one, from the one button', () => {
    renderBrowser();
    fireEvent.press(screen.getByTestId('venue-food-toggle-all'));
    expect(shownDishes()).toHaveLength(0);
    expect(screen.getByTestId('venue-food-toggle-all')).toHaveTextContent(/Expand all/);

    fireEvent.press(screen.getByTestId('venue-food-toggle-all'));
    expect(shownDishes()).toHaveLength(4);
  });

  it('is one plain list for a menu with no categories at all', () => {
    renderBrowser([dish({ category: '' }), dish({ id: 'tea', name: 'Green Tea', category: '' })]);
    expect(screen.queryByTestId('food-menu-section-0')).toBeNull();
    expect(screen.queryByTestId('venue-food-toggle-all')).toBeNull();
    expect(shownDishes()).toEqual(['food-item-open-chai', 'food-item-open-tea']);
  });
});

describe('FoodMenuBrowser — search', () => {
  it('keeps only the dishes whose name or description matches', () => {
    renderBrowser();
    fireEvent.changeText(screen.getByTestId('venue-food-search'), 'YOGHURT');
    expect(shownDishes()).toEqual(['food-item-open-lassi']);
    // The section that no longer holds a match goes with its dishes.
    expect(screen.queryByTestId('food-menu-section-1')).toBeNull();
  });

  it('opens every folded section once a search is typed, so no match hides', () => {
    renderBrowser();
    fireEvent.press(screen.getByTestId('venue-food-toggle-all'));
    fireEvent.changeText(screen.getByTestId('venue-food-search'), 'samosa');
    expect(shownDishes()).toEqual(['food-item-open-samosa']);
  });

  it('clears the search from its own button and shows the whole menu again', () => {
    renderBrowser();
    expect(screen.queryByTestId('venue-food-search-clear')).toBeNull();
    fireEvent.changeText(screen.getByTestId('venue-food-search'), 'chai');
    const clear = screen.getByTestId('venue-food-search-clear');
    expect(clear.props['aria-label']).toBe('Clear search');

    fireEvent.press(clear);
    expect(screen.getByTestId('venue-food-search').props.value).toBe('');
    expect(shownDishes()).toHaveLength(4);
    expect(screen.queryByTestId('venue-food-search-clear')).toBeNull();
  });

  it('says nothing matched, and offers no section button, for a search with no dish', () => {
    renderBrowser();
    fireEvent.changeText(screen.getByTestId('venue-food-search'), '  pizza ');
    expect(screen.getByTestId('venue-food-search-empty')).toHaveTextContent(
      'No dishes match "pizza".',
    );
    expect(screen.queryByTestId('food-menu-list')).toBeNull();
    expect(screen.queryByTestId('venue-food-toggle-all')).toBeNull();
  });
});

describe('FoodMenuBrowser — the dishes', () => {
  it('opens a dish’s own screen from its name, which reads as a link', () => {
    renderBrowser();
    const name = screen.getByTestId('food-item-open-samosa');
    expect(name.props.role).toBe('link');
    fireEvent.press(name);
    expect(onOpenDetails).toHaveBeenCalledWith(expect.objectContaining({ id: 'samosa' }));
  });

  it('gives each dish its own quantity from the cart', () => {
    renderBrowser();
    expect(screen.getByTestId('food-item-stepper-samosa-value')).toHaveTextContent('2');
    expect(screen.getByTestId('food-item-add-chai')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('food-item-add-chai'));
    expect(onQuantity).toHaveBeenCalledWith('chai', 1);
  });
});
