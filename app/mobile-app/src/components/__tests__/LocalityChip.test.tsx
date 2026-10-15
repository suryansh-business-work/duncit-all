import { screen } from '@testing-library/react-native';

import { LocalityChip } from '@/components/LocalityChip';
import { renderWithProviders } from '@/utils/test-utils';

describe('LocalityChip', () => {
  it('shows the trimmed area as a one-line pin chip', () => {
    renderWithProviders(<LocalityChip locality="  Gomti Nagar  " testID="club-locality" />);
    expect(screen.getByTestId('club-locality')).toBeOnTheScreen();
    expect(screen.getByText('Gomti Nagar')).toHaveProp('numberOfLines', 1);
  });

  // A long area truncates inside its card instead of running off it: the chip
  // is capped at the card's width and its text is the part that gives way.
  it('caps a long area at the card width and lets the text shrink', () => {
    const area = 'Sector 21, Gomti Nagar Extension, Lucknow, Uttar Pradesh';
    renderWithProviders(<LocalityChip locality={area} testID="club-locality" />);
    expect(screen.getByTestId('club-locality')).toHaveStyle({ maxWidth: '100%' });
    expect(screen.getByText(area)).toHaveStyle({ flexShrink: 1 });
  });

  it.each([
    ['missing', undefined],
    ['null', null],
    ['blank', '   '],
  ])('renders nothing when the area is %s', (_case, locality) => {
    renderWithProviders(<LocalityChip locality={locality} testID="club-locality" />);
    expect(screen.queryByTestId('club-locality')).toBeNull();
  });
});
