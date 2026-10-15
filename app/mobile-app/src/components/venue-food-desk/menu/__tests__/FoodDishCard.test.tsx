import { useEffect } from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import { useForm } from 'react-hook-form';
import type { FoodMenuConfig, FoodMenuFormValues, VenueFoodItem } from '@duncit/utils';

import { FoodDishCard } from '@/components/venue-food-desk/menu/FoodDishCard';
import { foodMenuTextValues } from '@/components/venue-food-desk/menu/foodMenuText';
import { renderWithProviders } from '@/utils/test-utils';

// The photo picker/upload has its own spec; the stand-in shows the label it is
// given and "uploads" one more photo when pressed, through the card's wiring.
jest.mock('@/components/create-pod/MediaUploadField', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Text } = require('react-native');
  return {
    MediaUploadField: ({
      label,
      value,
      onChange,
    }: {
      label: string;
      value: string;
      onChange: (text: string) => void;
    }) => (
      <Text testID="stub-media-upload" onPress={() => onChange(`${value}\nhttp://x/new.jpg`)}>
        {label}
      </Text>
    ),
  };
});

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

const dish = (over: Partial<VenueFoodItem> = {}): VenueFoodItem => ({
  id: 'd1',
  name: 'Paneer Tikka',
  description: '',
  category: 'Starters',
  price: 80,
  images: ['http://x/a.jpg'],
  diet: 'VEG',
  spice_level: 'MILD',
  is_available: true,
  ...over,
});

const onEdit = jest.fn();
const onRemove = jest.fn();

function Harness({ item, priceError }: Readonly<{ item: VenueFoodItem; priceError?: string }>) {
  const { control, setError } = useForm<FoodMenuFormValues>({
    defaultValues: foodMenuTextValues({
      id: 'v1',
      venue_name: 'Sunset Cafe',
      status: 'APPROVED',
      offers_food: true,
      food_menu: [item],
    }),
  });
  useEffect(() => {
    if (priceError) setError('food_menu.0.price', { message: priceError });
  }, [priceError, setError]);
  return (
    <FoodDishCard
      control={control}
      index={0}
      config={CONFIG}
      currency="₹"
      onEdit={onEdit}
      onRemove={onRemove}
    />
  );
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('FoodDishCard', () => {
  it('previews the price as guests see it, with the struck MRP and the saving', () => {
    renderWithProviders(<Harness item={dish({ original_price: 100 })} />);

    expect(screen.getByTestId('food-dish-0')).toHaveTextContent(/Paneer Tikka/);
    expect(screen.getByText('Vegetarian · Starters')).toBeOnTheScreen();
    expect(screen.getByTestId('food-item-price-dish-0')).toHaveTextContent('₹80');
    expect(screen.getByTestId('food-item-original-price-dish-0')).toHaveTextContent('₹100');
    expect(screen.getByTestId('food-item-saving-dish-0')).toHaveTextContent('20% off');
    expect(screen.queryByTestId('food-dish-0-error')).toBeNull();
  });

  it('shows only the price without an MRP, and only the section without a food type', () => {
    renderWithProviders(<Harness item={dish({ diet: undefined })} />);

    expect(screen.getByText('Starters')).toBeOnTheScreen();
    expect(screen.getByTestId('food-item-price-dish-0')).toHaveTextContent('₹80');
    expect(screen.queryByTestId('food-item-original-price-dish-0')).toBeNull();
  });

  it('names an untitled dish by its place on the menu', () => {
    renderWithProviders(<Harness item={dish({ name: '  ' })} />);

    expect(screen.getByTestId('food-dish-0')).toHaveTextContent(/Menu item 1/);
    expect(screen.getByTestId('food-dish-0-edit')).toHaveProp('aria-label', 'Edit Menu item 1');
  });

  it('shows the dish problem the menu rules found', () => {
    renderWithProviders(<Harness item={dish()} priceError="Enter a price of at least 1" />);

    expect(screen.getByTestId('food-dish-0-error')).toHaveTextContent(
      'Enter a price of at least 1',
    );
  });

  it('switches the dish off for today, adds a photo, and opens or removes it', () => {
    renderWithProviders(<Harness item={dish()} />);

    const available = screen.getByTestId('food-dish-0-available-switch');
    expect(available).toHaveProp('value', true);
    fireEvent(available, 'valueChange', false);
    expect(screen.getByTestId('food-dish-0-available-switch')).toHaveProp('value', false);

    expect(screen.getByTestId('stub-media-upload')).toHaveTextContent('Photos (1 of 4)');
    fireEvent.press(screen.getByTestId('stub-media-upload'));
    expect(screen.getByTestId('stub-media-upload')).toHaveTextContent('Photos (2 of 4)');

    expect(screen.getByTestId('food-dish-0-edit')).toHaveProp('aria-label', 'Edit Paneer Tikka');
    fireEvent.press(screen.getByTestId('food-dish-0-edit'));
    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('food-dish-0-remove')).toHaveProp(
      'aria-label',
      'Delete Paneer Tikka',
    );
    fireEvent.press(screen.getByTestId('food-dish-0-remove'));
    expect(onRemove).toHaveBeenCalledTimes(1);
  });
});
