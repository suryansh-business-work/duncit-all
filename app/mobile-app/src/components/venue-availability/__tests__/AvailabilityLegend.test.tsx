import { screen } from '@testing-library/react-native';

import { renderWithProviders } from '@/utils/test-utils';
import { AvailabilityLegend } from '../AvailabilityLegend';

jest.mock('@/hooks/useTranslation', () => {
  const t = (key: string) => key;
  return { useTranslation: () => ({ t }) };
});

describe('AvailabilityLegend', () => {
  it('explains the four slot statuses and the leave tag', () => {
    renderWithProviders(<AvailabilityLegend />);
    expect(screen.getByTestId('availability-legend')).toBeOnTheScreen();
    for (const key of ['available', 'pending', 'booked', 'blocked', 'leave']) {
      expect(screen.getByText(`availability.legend.${key}`)).toBeOnTheScreen();
    }
  });
});
