import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import HomeScreen from '@/app/index';
import * as locationService from '@/services/location.service';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/services/location.service');

const mockedService = jest.mocked(locationService);

describe('HomeScreen', () => {
  afterEach(() => jest.clearAllMocks());

  it('renders the title and idle state', () => {
    renderWithProviders(<HomeScreen />);
    expect(screen.getByText('Duncit Location Demo')).toBeOnTheScreen();
    expect(screen.getByTestId('permission-status')).toHaveTextContent('undetermined');
  });

  it('fetches and displays coordinates', async () => {
    mockedService.getCurrentLocation.mockResolvedValue({
      permission: 'granted',
      coordinates: { latitude: 11, longitude: 22 },
    });

    renderWithProviders(<HomeScreen />);
    fireEvent.press(screen.getByTestId('get-location-button'));

    await waitFor(() =>
      expect(screen.getByTestId('latitude-value')).toHaveTextContent('11.000000'),
    );
    expect(screen.getByTestId('permission-status')).toHaveTextContent('granted');
  });

  it('shows an error when permission is denied', async () => {
    mockedService.getCurrentLocation.mockRejectedValue(
      new Error('Location permission was denied.'),
    );

    renderWithProviders(<HomeScreen />);
    fireEvent.press(screen.getByTestId('get-location-button'));

    await waitFor(() => expect(screen.getByTestId('error-state')).toBeOnTheScreen());
    expect(screen.getByTestId('error-state')).toHaveTextContent('Location permission was denied.');
  });

  it('sends the captured location', async () => {
    mockedService.getCurrentLocation.mockResolvedValue({
      permission: 'granted',
      coordinates: { latitude: 1, longitude: 2 },
    });
    mockedService.sendLocation.mockResolvedValue({ id: 'loc_9', receivedAt: 'now' });

    renderWithProviders(<HomeScreen />);
    fireEvent.press(screen.getByTestId('get-location-button'));
    await waitFor(() => expect(screen.getByTestId('latitude-value')).toHaveTextContent('1.000000'));

    fireEvent.press(screen.getByTestId('send-location-button'));
    await waitFor(() =>
      expect(screen.getByTestId('api-response')).toHaveTextContent('Saved (loc_9)'),
    );
  });
});
