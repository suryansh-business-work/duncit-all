import { act, fireEvent, screen } from '@testing-library/react-native';
import { Text } from 'tamagui';

import { ClubsLocationEmpty } from '@/components/home/ClubsLocationEmpty';
import { renderWithProviders } from '@/utils/test-utils';

const mockDialog = jest.fn();
jest.mock('@/components/LocationDialog', () => ({
  LocationDialog: (props: { open: boolean; onClose: () => void }) => mockDialog(props),
}));

beforeEach(() => {
  mockDialog.mockReset();
  mockDialog.mockImplementation(({ open }: { open: boolean }) =>
    open ? <Text testID="loc-dialog">open</Text> : null,
  );
});

describe('ClubsLocationEmpty', () => {
  it('shows the message and opens/closes the picker via Reset Location', () => {
    renderWithProviders(<ClubsLocationEmpty />);
    expect(screen.getByTestId('clubs-location-empty')).toBeOnTheScreen();
    expect(screen.getByText('No Clubs operating at the selected location,')).toBeOnTheScreen();

    // Picker starts closed; Reset Location opens it.
    expect(screen.queryByTestId('loc-dialog')).toBeNull();
    fireEvent.press(screen.getByTestId('clubs-location-reset'));
    expect(screen.getByTestId('loc-dialog')).toBeOnTheScreen();

    // onClose closes it again.
    const props = mockDialog.mock.calls.at(-1)?.[0] as { onClose: () => void };
    act(() => props.onClose());
    expect(screen.queryByTestId('loc-dialog')).toBeNull();
  });
});
