import type { ComponentType } from 'react';
import { screen } from '@testing-library/react-native';

import { PodPlansScreen } from '@/screens/PodPlansScreen';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ canGoBack: () => true, goBack: jest.fn() }),
}));

// NB: Be-a-Host / Register-Venue now render the survey/meeting gate instead of a
// plain placeholder — covered in survey-onboarding/__tests__. Pod Ideas + Hosts
// Management are now full feature screens — covered in their own specs.
// Venue Management graduated into the Venue Studio dashboard (own spec).
const SCREENS: [string, ComponentType][] = [['Pod Plans', PodPlansScreen]];

describe('account menu screens', () => {
  it.each(SCREENS)('renders the %s placeholder', (title, Screen) => {
    renderWithProviders(<Screen />);
    expect(screen.getByTestId('placeholder-screen')).toBeOnTheScreen();
    expect(screen.getAllByText(title).length).toBeGreaterThan(0);
  });
});
