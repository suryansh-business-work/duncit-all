import { act, fireEvent, screen } from '@testing-library/react-native';
import { Text } from 'tamagui';

import { ClubsLocationNote } from '@/components/home/ClubsLocationNote';
import { useLocations } from '@/hooks/useLocations';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/hooks/useLocations', () => ({ useLocations: jest.fn() }));

const mockDialog = jest.fn();
jest.mock('@/components/LocationDialog', () => ({
  LocationDialog: (props: { open: boolean; onClose: () => void }) => mockDialog(props),
}));

const mockedLocations = useLocations as jest.Mock;

beforeEach(() => {
  mockDialog.mockReset();
  mockDialog.mockImplementation(({ open }: { open: boolean }) =>
    open ? <Text testID="loc-dialog">open</Text> : null,
  );
});

describe('ClubsLocationNote', () => {
  it('renders nothing when no location is selected', () => {
    mockedLocations.mockReturnValue({ selectedId: '', cityLabel: 'Delhi', zoneName: '' });
    renderWithProviders(<ClubsLocationNote />);
    expect(screen.queryByTestId('clubs-location-note')).toBeNull();
  });

  it('renders nothing when a location is selected but has no label', () => {
    mockedLocations.mockReturnValue({ selectedId: 'loc1', cityLabel: '', zoneName: '' });
    renderWithProviders(<ClubsLocationNote />);
    expect(screen.queryByTestId('clubs-location-note')).toBeNull();
  });

  it('shows the city + zone and opens/closes the picker', () => {
    mockedLocations.mockReturnValue({ selectedId: 'loc1', cityLabel: 'Delhi', zoneName: 'Saket' });
    renderWithProviders(<ClubsLocationNote />);
    expect(screen.getByTestId('clubs-location-note')).toBeOnTheScreen();
    expect(screen.getByText(/Delhi · Saket/)).toBeOnTheScreen();
    // Closed to start; tapping the link opens the picker.
    expect(screen.queryByTestId('loc-dialog')).toBeNull();
    fireEvent.press(screen.getByTestId('clubs-location-note-change'));
    expect(screen.getByTestId('loc-dialog')).toBeOnTheScreen();
    // The dialog's onClose closes it again.
    const props = mockDialog.mock.calls.at(-1)?.[0] as { onClose: () => void };
    act(() => props.onClose());
    expect(screen.queryByTestId('loc-dialog')).toBeNull();
  });

  it('shows just the city when there is no zone', () => {
    mockedLocations.mockReturnValue({ selectedId: 'loc1', cityLabel: 'Mumbai', zoneName: '' });
    renderWithProviders(<ClubsLocationNote />);
    expect(screen.getByText('Mumbai')).toBeOnTheScreen();
  });
});
