import { render, screen } from '@testing-library/react-native';

import { LoadingIndicator } from '@/components/LoadingIndicator';

describe('LoadingIndicator', () => {
  it('renders without a label', () => {
    render(<LoadingIndicator testID="loader" />);
    expect(screen.getByTestId('loader')).toBeOnTheScreen();
    expect(screen.queryByText('Loading…')).toBeNull();
  });

  it('renders the provided label', () => {
    render(<LoadingIndicator testID="loader" label="Loading…" />);
    expect(screen.getByText('Loading…')).toBeOnTheScreen();
  });
});
