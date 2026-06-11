import type { ComponentType } from 'react';
import { screen } from '@testing-library/react-native';

import { HostManageScreen } from '@/screens/HostManageScreen';
import { PodPlansScreen } from '@/screens/PodPlansScreen';
import { VenueManageScreen } from '@/screens/VenueManageScreen';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@react-navigation/native', () => ({ useNavigation: () => ({ goBack: jest.fn() }) }));

// NB: Be-a-Host / Register-Venue now render the survey/meeting gate instead of a
// plain placeholder — covered in survey-onboarding/__tests__. Pod Ideas is now a
// full feature screen — covered in PodIdeasScreen.test.
const SCREENS: [string, ComponentType][] = [
  ['Hosts Management', HostManageScreen],
  ['Venue Management', VenueManageScreen],
  ['Pod Plans', PodPlansScreen],
];

describe('account menu screens', () => {
  it.each(SCREENS)('renders the %s placeholder', (title, Screen) => {
    renderWithProviders(<Screen />);
    expect(screen.getByTestId('placeholder-screen')).toBeOnTheScreen();
    expect(screen.getAllByText(title).length).toBeGreaterThan(0);
  });
});
