import { screen } from '@testing-library/react-native';

import { AppBackground } from '@/components/AppBackground';
import { renderWithProviders } from '@/utils/test-utils';

describe('AppBackground', () => {
  it('renders the gradient backdrop', () => {
    renderWithProviders(<AppBackground />);
    expect(screen.getByTestId('app-background')).toBeOnTheScreen();
  });
});
