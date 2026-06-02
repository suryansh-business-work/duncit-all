import { render, screen } from '@testing-library/react-native';

import { LocationPanel } from '@/components/LocationPanel';

describe('LocationPanel', () => {
  it('renders placeholders when no coordinates are present', () => {
    render(
      <LocationPanel
        permission="undetermined"
        coordinates={null}
        isFetching={false}
        sendResponse={null}
        error={null}
      />,
    );
    expect(screen.getByTestId('permission-status')).toHaveTextContent('undetermined');
    expect(screen.getByTestId('latitude-value')).toHaveTextContent('—');
    expect(screen.getByTestId('loading-state')).toHaveTextContent('Idle');
  });

  it('renders coordinates, loading and response state', () => {
    render(
      <LocationPanel
        permission="granted"
        coordinates={{ latitude: 12.34, longitude: 56.78 }}
        isFetching
        sendResponse={{ id: 'loc_1', receivedAt: '2026-06-02T00:00:00Z' }}
        error={null}
      />,
    );
    expect(screen.getByTestId('latitude-value')).toHaveTextContent('12.340000');
    expect(screen.getByTestId('longitude-value')).toHaveTextContent('56.780000');
    expect(screen.getByTestId('loading-state')).toHaveTextContent('Fetching…');
    expect(screen.getByTestId('api-response')).toHaveTextContent('Saved (loc_1)');
  });

  it('renders the error message when present', () => {
    render(
      <LocationPanel
        permission="denied"
        coordinates={null}
        isFetching={false}
        sendResponse={null}
        error="Location permission was denied."
      />,
    );
    expect(screen.getByTestId('error-state')).toHaveTextContent('Location permission was denied.');
  });
});
