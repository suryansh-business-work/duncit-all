import { screen } from '@testing-library/react-native';

import { LoadingIndicator } from '@/components/LoadingIndicator';
import { renderWithProviders } from '@/utils/test-utils';

describe('LoadingIndicator', () => {
  it('renders without a label', () => {
    renderWithProviders(<LoadingIndicator testID="loader" />);
    expect(screen.getByTestId('loader')).toBeOnTheScreen();
    expect(screen.queryByText('Loading…')).toBeNull();
  });

  it('renders the provided label', () => {
    renderWithProviders(<LoadingIndicator testID="loader" label="Loading…" />);
    expect(screen.getByText('Loading…')).toBeOnTheScreen();
  });
});
