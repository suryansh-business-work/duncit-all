/* eslint-disable @typescript-eslint/no-require-imports -- jest.mock factories require lazily */
import { render, screen } from '@testing-library/react-native';

import { BecomeHostScreen } from '@/screens/BecomeHostScreen';
import { ExploreScreen } from '@/screens/ExploreScreen';
import { ListProductScreen } from '@/screens/ListProductScreen';
import { RegisterVenueScreen } from '@/screens/RegisterVenueScreen';

const mockSurveyProps = jest.fn();
jest.mock('@/components/survey-onboarding/OnboardingSurvey', () => ({
  OnboardingSurvey: (props: Record<string, unknown>) => {
    mockSurveyProps(props);
    return null;
  },
}));

jest.mock('@/components/TabScreen', () => ({
  TabScreen: ({ testID, children }: { testID: string; children: React.ReactNode }) =>
    require('react').createElement(require('react-native').View, { testID }, children),
}));
jest.mock('@/components/explore/ExploreReels', () => ({
  ExploreReels: () => require('react').createElement(require('react-native').Text, null, 'reels'),
}));

beforeEach(() => mockSurveyProps.mockClear());

describe('survey-gated account screens', () => {
  it('BecomeHostScreen renders the HOST onboarding survey with its copy', () => {
    render(<BecomeHostScreen />);
    expect(mockSurveyProps.mock.calls[0]![0]).toMatchObject({
      kind: 'HOST',
      title: 'Be a host',
      icon: 'storefront',
    });
  });

  it('RegisterVenueScreen renders the VENUE onboarding survey with its copy', () => {
    render(<RegisterVenueScreen />);
    expect(mockSurveyProps.mock.calls[0]![0]).toMatchObject({
      kind: 'VENUE',
      title: 'Be a Venue Owner',
      icon: 'add-business',
    });
  });

  it('ListProductScreen renders the ECOMM onboarding survey with its copy', () => {
    render(<ListProductScreen />);
    expect(mockSurveyProps.mock.calls[0]![0]).toMatchObject({
      kind: 'ECOMM',
      title: 'List your product',
      icon: 'inventory-2',
    });
  });
});

describe('ExploreScreen', () => {
  it('mounts the reels feed inside the explore tab scaffold', () => {
    render(<ExploreScreen />);
    expect(screen.getByTestId('explore-screen')).toBeOnTheScreen();
    expect(screen.getByText('reels')).toBeOnTheScreen();
  });
});
