import { screen } from '@testing-library/react-native';

import { FieldLabel } from '@/components/Field';
import { renderWithProviders } from '@/utils/test-utils';

describe('FieldLabel', () => {
  it('renders just the label with test ids and no asterisk by default', () => {
    renderWithProviders(<FieldLabel label="City" testID="city" />);
    expect(screen.getByTestId('city-label')).toHaveTextContent('City');
    expect(screen.queryByTestId('city-required')).toBeNull();
  });

  it('suffixes a red required asterisk after the label when required', () => {
    renderWithProviders(<FieldLabel label="City" required testID="city" />);
    expect(screen.getByTestId('city-required')).toHaveTextContent('*');
    expect(screen.getByTestId('city-label')).toHaveTextContent('City *');
  });

  it('renders the required asterisk with no test ids when no testID is given', () => {
    renderWithProviders(<FieldLabel label="City" required />);
    expect(screen.getByText('*')).toBeOnTheScreen();
    expect(screen.queryByTestId('city-label')).toBeNull();
    expect(screen.queryByTestId('city-required')).toBeNull();
  });
});
