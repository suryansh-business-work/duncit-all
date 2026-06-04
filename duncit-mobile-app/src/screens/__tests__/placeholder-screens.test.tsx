import type { ComponentType } from 'react';
import { screen } from '@testing-library/react-native';

import { BecomeHostScreen } from '@/screens/BecomeHostScreen';
import { HostManageScreen } from '@/screens/HostManageScreen';
import { PodIdeasScreen } from '@/screens/PodIdeasScreen';
import { PodPlansScreen } from '@/screens/PodPlansScreen';
import { RegisterVenueScreen } from '@/screens/RegisterVenueScreen';
import { VenueManageScreen } from '@/screens/VenueManageScreen';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@react-navigation/native', () => ({ useNavigation: () => ({ goBack: jest.fn() }) }));

const SCREENS: [string, ComponentType][] = [
  ['Be a host', BecomeHostScreen],
  ['Hosts Management', HostManageScreen],
  ['Be a Venue Owner', RegisterVenueScreen],
  ['Venue Management', VenueManageScreen],
  ['Pod Ideas', PodIdeasScreen],
  ['Pod Plans', PodPlansScreen],
];

describe('account menu screens', () => {
  it.each(SCREENS)('renders the %s placeholder', (title, Screen) => {
    renderWithProviders(<Screen />);
    expect(screen.getByTestId('placeholder-screen')).toBeOnTheScreen();
    expect(screen.getAllByText(title).length).toBeGreaterThan(0);
  });
});
