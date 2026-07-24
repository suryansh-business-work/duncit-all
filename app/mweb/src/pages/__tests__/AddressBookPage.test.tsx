import { describe, expect, it } from 'vitest';
import { MockedProvider } from '@apollo/client/testing';
import { render, screen, waitFor } from '@testing-library/react';
import AddressBookPage from '../AddressBookPage';
import { MY_ADDRESSES } from '../account-page/AddressBookSection';

const emptyMock = {
  request: { query: MY_ADDRESSES },
  result: { data: { myAddresses: [] } },
};

describe('AddressBookPage', () => {
  it('renders the Address Book section as a standalone page', async () => {
    render(
      <MockedProvider mocks={[emptyMock]}>
        <AddressBookPage />
      </MockedProvider>,
    );
    expect(screen.getByText('Address Book')).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByText(/save delivery addresses here/i)).toBeInTheDocument(),
    );
  });
});
