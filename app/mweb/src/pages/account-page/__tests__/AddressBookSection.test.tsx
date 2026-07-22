import { describe, expect, it } from 'vitest';
import { MockedProvider } from '@apollo/client/testing';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import AddressBookSection, {
  MY_ADDRESSES,
  SAVE_MY_ADDRESS,
  DELETE_MY_ADDRESS,
} from '../AddressBookSection';

const addr = {
  __typename: 'UserAddress',
  id: 'addr-1',
  label: 'Home',
  name: 'Alice',
  phone: '9999999999',
  email: 'a@b.com',
  line1: '221B Baker St',
  line2: 'Floor 2',
  landmark: 'Near Park',
  city: 'London',
  state: 'LDN',
  pincode: '123456',
  country: 'India',
  is_default: true,
};

const saveInput = {
  label: 'Home',
  name: 'Alice',
  phone: '9999999999',
  line1: '221B Baker St',
  line2: 'Floor 2',
  landmark: 'Near Park',
  city: 'London',
  state: 'LDN',
  pincode: '123456',
  country: 'India',
  is_default: true,
};

const listMock = (addresses: unknown[]) => ({
  request: { query: MY_ADDRESSES },
  result: { data: { myAddresses: addresses } },
});

const renderSection = (mocks: unknown[]) =>
  render(
    <MockedProvider mocks={mocks as never}>
      <AddressBookSection />
    </MockedProvider>,
  );

describe('AddressBookSection', () => {
  it('shows the empty-state hint when there are no saved addresses', async () => {
    renderSection([listMock([]), listMock([])]);
    expect(
      await screen.findByText(/Save delivery addresses here to pick them quickly/i),
    ).toBeInTheDocument();
  });

  it('renders saved addresses with a Default chip and a single-line summary', async () => {
    renderSection([listMock([addr]), listMock([addr])]);
    expect(await screen.findByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Default')).toBeInTheDocument();
    expect(
      screen.getByText('221B Baker St, Floor 2, Near Park, London, LDN, 123456'),
    ).toBeInTheDocument();
  });

  it('surfaces a GraphQL query error', async () => {
    renderSection([
      { request: { query: MY_ADDRESSES }, error: new Error('network down') },
    ]);
    expect(await screen.findByText('network down')).toBeInTheDocument();
  });

  it('opens the Add dialog and closes it on cancel', async () => {
    renderSection([listMock([]), listMock([])]);
    fireEvent.click(await screen.findByRole('button', { name: /add address/i }));
    expect(await screen.findByRole('heading', { name: 'Add address' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    await waitFor(() =>
      expect(screen.queryByRole('heading', { name: 'Add address' })).not.toBeInTheDocument(),
    );
  });

  it('edits an address and fires saveMyAddress + refetch on save', async () => {
    let saved = false;
    const saveMock = {
      request: { query: SAVE_MY_ADDRESS, variables: { id: 'addr-1', input: saveInput } },
      result: () => {
        saved = true;
        return { data: { saveMyAddress: addr } };
      },
    };
    renderSection([listMock([addr]), saveMock, listMock([addr])]);

    fireEvent.click(await screen.findByRole('button', { name: 'Edit Home' }));
    expect(await screen.findByText('Edit address')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /save address/i }));

    await waitFor(() => expect(saved).toBe(true));
    await waitFor(() =>
      expect(screen.queryByText('Edit address')).not.toBeInTheDocument(),
    );
  });

  it('shows a notice when saving fails', async () => {
    const saveMock = {
      request: { query: SAVE_MY_ADDRESS, variables: { id: 'addr-1', input: saveInput } },
      error: new Error('save blew up'),
    };
    renderSection([listMock([addr]), saveMock]);

    fireEvent.click(await screen.findByRole('button', { name: 'Edit Home' }));
    fireEvent.click(await screen.findByRole('button', { name: /save address/i }));

    expect(await screen.findByText('save blew up')).toBeInTheDocument();
  });

  it('deletes an address and refetches the list', async () => {
    let deleted = false;
    const deleteMock = {
      request: { query: DELETE_MY_ADDRESS, variables: { id: 'addr-1' } },
      result: () => {
        deleted = true;
        return { data: { deleteMyAddress: true } };
      },
    };
    renderSection([listMock([addr]), deleteMock, listMock([])]);

    fireEvent.click(await screen.findByRole('button', { name: 'Delete Home' }));
    await waitFor(() => expect(deleted).toBe(true));
  });

  it('shows a notice when deleting fails and dismisses it', async () => {
    const deleteMock = {
      request: { query: DELETE_MY_ADDRESS, variables: { id: 'addr-1' } },
      error: new Error('delete blew up'),
    };
    renderSection([listMock([addr]), deleteMock]);

    fireEvent.click(await screen.findByRole('button', { name: 'Delete Home' }));
    const notice = await screen.findByText('delete blew up');
    expect(notice).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    await waitFor(() =>
      expect(screen.queryByText('delete blew up')).not.toBeInTheDocument(),
    );
  });
});
