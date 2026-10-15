import { screen } from '@testing-library/react-native';

import { FoodItemPrice } from '@/components/details/venue-food/FoodItemPrice';
import { FoodLicenceNote } from '@/components/details/venue-food/FoodLicenceNote';
import { renderWithProviders } from '@/utils/test-utils';

describe('FoodItemPrice', () => {
  it('shows just the price when the dish has no MRP above it', () => {
    const { rerender } = renderWithProviders(
      <FoodItemPrice item={{ id: 'chai', price: 120 }} currency="₹" />,
    );
    expect(screen.getByTestId('food-item-price-chai')).toHaveTextContent('₹120');
    expect(screen.queryByTestId('food-item-original-price-chai')).toBeNull();
    expect(screen.queryByTestId('food-item-saving-chai')).toBeNull();

    // An MRP at or below the price is not a saving — nothing is struck.
    rerender(<FoodItemPrice item={{ id: 'chai', price: 120, original_price: 120 }} currency="₹" />);
    expect(screen.queryByTestId('food-item-original-price-chai')).toBeNull();
  });

  it('strikes the MRP through and shows the saving as a percentage by default', () => {
    renderWithProviders(
      <FoodItemPrice item={{ id: 'chai', price: 120, original_price: 150 }} currency="₹" />,
    );
    expect(screen.getByTestId('food-item-price-chai')).toHaveTextContent('₹120');
    const original = screen.getByTestId('food-item-original-price-chai');
    expect(original).toHaveTextContent('₹150');
    expect(screen.getByLabelText('Original price ₹150')).toBeOnTheScreen();
    expect(screen.getByTestId('food-item-saving-chai')).toHaveTextContent('20% off');
  });

  it('shows the saving as an amount when the owner chose it, in the given currency', () => {
    renderWithProviders(
      <FoodItemPrice
        item={{ id: 'chai', price: 120, original_price: 150, saving_display: 'AMOUNT' }}
        currency="$"
      />,
    );
    expect(screen.getByTestId('food-item-price-chai')).toHaveTextContent('$120');
    expect(screen.getByTestId('food-item-saving-chai')).toHaveTextContent('$30 off');
  });

  it('reads typed form text the same way for the owner preview', () => {
    renderWithProviders(
      <FoodItemPrice
        item={{ id: 'dish-0', price: '80', original_price: '100', saving_display: 'PERCENT' }}
        currency="₹"
        audience="owner"
      />,
    );
    expect(screen.getByTestId('food-item-price-dish-0')).toHaveTextContent('₹80');
    expect(screen.getByTestId('food-item-original-price-dish-0')).toHaveTextContent('₹100');
    expect(screen.getByTestId('food-item-saving-dish-0')).toHaveTextContent('20% off');
  });
});

describe('FoodLicenceNote', () => {
  it('prints the trimmed FSSAI number at the foot of the menu', () => {
    renderWithProviders(<FoodLicenceNote fssai="  12345678901234 " />);
    expect(screen.getByTestId('venue-food-fssai')).toHaveTextContent(
      'FSSAI Lic. No. 12345678901234',
    );
  });

  it('renders nothing while the venue has not given a number', () => {
    const { rerender } = renderWithProviders(<FoodLicenceNote />);
    expect(screen.queryByTestId('venue-food-fssai')).toBeNull();
    rerender(<FoodLicenceNote fssai={null} />);
    expect(screen.queryByTestId('venue-food-fssai')).toBeNull();
    rerender(<FoodLicenceNote fssai="   " />);
    expect(screen.queryByTestId('venue-food-fssai')).toBeNull();
  });
});
