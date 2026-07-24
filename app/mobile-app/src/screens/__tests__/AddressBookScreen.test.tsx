import { screen, waitFor } from '@testing-library/react-native';

import { AddressBookScreen } from '@/screens/AddressBookScreen';
import { graphqlRequest } from '@/services/graphql.client';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ canGoBack: () => true, goBack: jest.fn(), navigate: jest.fn() }),
}));

const mockRequest = graphqlRequest as jest.Mock;

describe('AddressBookScreen', () => {
  it('renders the Address Book section inside a titled stack screen', async () => {
    mockRequest.mockResolvedValue({ myAddresses: [] });
    renderWithProviders(<AddressBookScreen />);

    expect(screen.getByTestId('address-book-screen')).toBeOnTheScreen();
    await waitFor(() => expect(screen.getByTestId('address-book-section')).toBeOnTheScreen());
    // Title (back-bar) + the section header both read "Address Book".
    expect(screen.getAllByText('Address Book').length).toBeGreaterThan(0);
  });
});
