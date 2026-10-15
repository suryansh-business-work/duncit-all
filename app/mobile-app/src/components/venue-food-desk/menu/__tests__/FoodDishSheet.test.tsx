import { useEffect } from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { useForm, type UseFormTrigger } from 'react-hook-form';
import type { FoodMenuConfig, FoodMenuFormValues, VenueFoodItem } from '@duncit/utils';

import { FoodDishSheet } from '@/components/venue-food-desk/menu/FoodDishSheet';
import { foodMenuTextValues } from '@/components/venue-food-desk/menu/foodMenuText';
import { renderWithProviders } from '@/utils/test-utils';

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
  description: 'Smoky.',
  category: 'Starters',
  price: 80,
  images: [],
  diet: 'VEG',
  spice_level: 'MILD',
  is_available: true,
  original_price: 100,
  saving_display: 'PERCENT',
};

const onClose = jest.fn();

interface HarnessProps {
  index: number | null;
  isNew?: boolean;
  /** Stands in for the form's own check, to play a dish the rules refuse. */
  check?: UseFormTrigger<FoodMenuFormValues>;
  /** Raise the menu rules' errors on the dish's choice fields. */
  withErrors?: boolean;
}

function Harness({ index, isNew = false, check, withErrors = false }: Readonly<HarnessProps>) {
  const { control, trigger, setError } = useForm<FoodMenuFormValues>({
    defaultValues: foodMenuTextValues({
      id: 'v1',
      venue_name: 'Sunset Cafe',
      status: 'APPROVED',
      offers_food: true,
      food_menu: [DISH],
    }),
  });
  useEffect(() => {
    if (!withErrors) return;
    setError('food_menu.0.saving_display', { message: 'Pick how the saving reads' });
    setError('food_menu.0.diet', { message: 'Pick a food type' });
    setError('food_menu.0.spice_level', { message: 'Pick a spice level' });
    setError('food_menu.0.videos', { message: 'At most 2 videos' });
  }, [withErrors, setError]);
  return (
    <FoodDishSheet
      control={control}
      trigger={check ?? trigger}
      index={index}
      config={CONFIG}
      onClose={onClose}
      isNew={isNew}
    />
  );
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('FoodDishSheet', () => {
  it('renders nothing while no dish is being edited', () => {
    renderWithProviders(<Harness index={null} />);
    expect(screen.queryByTestId('food-dish-sheet')).toBeNull();
  });

  it('edits the struck-through MRP and how the saving reads', () => {
    renderWithProviders(<Harness index={0} />);

    expect(screen.getByTestId('food-dish-sheet-title')).toHaveTextContent('Menu item 1');
    expect(screen.getByTestId('field-food_menu.0.price')).toHaveProp('value', '80');
    const mrp = screen.getByTestId('field-food_menu.0.original_price');
    expect(mrp).toHaveProp('value', '100');
    expect(screen.getByTestId('food_menu.0.original_price-hint')).toHaveTextContent(
      'Optional. Shown struck through beside the price — guests always pay the price.',
    );
    fireEvent.changeText(mrp, '120');
    expect(screen.getByTestId('field-food_menu.0.original_price')).toHaveProp('value', '120');

    const percent = screen.getByTestId('food-dish-saving-display-PERCENT');
    const amount = screen.getByTestId('food-dish-saving-display-AMOUNT');
    expect(percent).toHaveTextContent('A percentage off');
    expect(amount).toHaveTextContent('An amount off');
    expect(percent).toHaveProp('aria-checked', true);
    fireEvent.press(amount);
    expect(screen.getByTestId('food-dish-saving-display-AMOUNT')).toHaveProp('aria-checked', true);
    expect(screen.getByTestId('food-dish-saving-display-PERCENT')).toHaveProp(
      'aria-checked',
      false,
    );
  });

  it("adds a YouTube link to the dish's videos, up to the configured limit", async () => {
    renderWithProviders(<Harness index={0} />);

    expect(screen.getByTestId('food-dish-videos-label-label')).toHaveTextContent('Videos (0 of 2)');
    fireEvent.changeText(screen.getByTestId('field-url'), 'https://youtu.be/dQw4w9WgXcQ');
    fireEvent.press(screen.getByTestId('food-dish-videos-youtube-add'));

    expect(await screen.findByText('YouTube video 1')).toBeOnTheScreen();
    expect(screen.getByTestId('food-dish-videos-label-label')).toHaveTextContent('Videos (1 of 2)');
  });

  it("shows the menu rules' errors under the saving, food type, spice and videos fields", async () => {
    renderWithProviders(<Harness index={0} withErrors />);

    expect(await screen.findByTestId('food-dish-saving-display-error')).toHaveTextContent(
      'Pick how the saving reads',
    );
    expect(screen.getByTestId('food-dish-diet-error')).toHaveTextContent('Pick a food type');
    expect(screen.getByTestId('food-dish-spice-error')).toHaveTextContent('Pick a spice level');
    expect(screen.getByText('At most 2 videos')).toBeOnTheScreen();
  });

  it('lets go on Done once the dish passes the menu rules', async () => {
    renderWithProviders(<Harness index={0} />);

    fireEvent.press(screen.getByTestId('food-dish-done'));
    await waitFor(() => expect(onClose).toHaveBeenCalledWith(false));
  });

  it('stays open on Done while the dish breaks a rule', async () => {
    const check = jest.fn().mockResolvedValue(false);
    renderWithProviders(<Harness index={0} check={check} />);

    fireEvent.press(screen.getByTestId('food-dish-done'));
    await waitFor(() => expect(check).toHaveBeenCalledWith('food_menu.0'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('discards a just-added dish on Cancel, and keeps an existing one', () => {
    const { rerender } = renderWithProviders(<Harness index={0} isNew />);
    fireEvent.press(screen.getByTestId('food-dish-cancel'));
    expect(onClose).toHaveBeenLastCalledWith(true);

    rerender(<Harness index={0} />);
    fireEvent.press(screen.getByTestId('food-dish-sheet-close'));
    expect(onClose).toHaveBeenLastCalledWith(false);
  });
});
