import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
import { describe, expect, it, vi } from 'vitest';
import SavedAddressPicker from '../SavedAddressPicker';
import { MY_ADDRESSES } from '../../account-page/AddressBookSection';
import type { UserAddress } from '../../account-page/address-book-form';

const home = {
  __typename: 'UserAddress',
  id: 'a1',
  label: 'Home',
  name: 'Jane Doe',
  phone: '9876543210',
  email: 'jane@example.com',
  line1: '12 Baker Street',
  line2: '',
  landmark: '',
  city: 'Mumbai',
  state: 'MH',
  pincode: '400001',
  country: 'India',
  is_default: true,
};

const work = {
  ...home,
  id: 'a2',
  label: 'Work',
  line1: '99 Tech Park',
  city: 'Pune',
  is_default: false,
};

const listMock = (addresses: unknown[]) => ({
  request: { query: MY_ADDRESSES },
  result: { data: { myAddresses: addresses } },
});

describe('SavedAddressPicker', () => {
  it('renders nothing while the address book is empty', async () => {
    const { container } = render(
      <MockedProvider mocks={[listMock([]), listMock([])]}>
        <SavedAddressPicker onPick={vi.fn()} />
      </MockedProvider>,
    );
    await waitFor(() =>
      expect(container.querySelector('.MuiTextField-root')).not.toBeInTheDocument(),
    );
  });

  it('renders a saved-address dropdown once addresses load', async () => {
    render(
      <MockedProvider mocks={[listMock([home, work]), listMock([home, work])]}>
        <SavedAddressPicker onPick={vi.fn()} />
      </MockedProvider>,
    );
    expect(await screen.findByLabelText('Deliver to a saved address')).toBeInTheDocument();
  });

  it('auto-selects the default address on load and fires onPick with it', async () => {
    const onPick = vi.fn();
    render(
      <MockedProvider mocks={[listMock([home, work]), listMock([home, work])]}>
        <SavedAddressPicker onPick={onPick} />
      </MockedProvider>,
    );

    await screen.findByLabelText('Deliver to a saved address');
    await waitFor(() => expect(onPick).toHaveBeenCalled());
    const first = onPick.mock.calls[0][0] as UserAddress;
    expect(first.id).toBe('a1');
    // The default shows pre-selected in the field.
    expect(screen.getByRole('combobox')).toHaveTextContent(
      'Home (default) — 12 Baker Street, Mumbai',
    );
  });

  it('re-fires onPick with the chosen address when the buyer picks another', async () => {
    const onPick = vi.fn();
    render(
      <MockedProvider mocks={[listMock([home, work]), listMock([home, work])]}>
        <SavedAddressPicker onPick={onPick} />
      </MockedProvider>,
    );

    await screen.findByLabelText('Deliver to a saved address');
    fireEvent.mouseDown(screen.getByRole('combobox'));

    const listbox = await screen.findByRole('listbox');
    const options = within(listbox).getAllByRole('option');
    // default suffix rendered only for the default address
    expect(options[0]).toHaveTextContent('Home (default) — 12 Baker Street, Mumbai');
    expect(options[1]).toHaveTextContent('Work — 99 Tech Park, Pune');

    fireEvent.click(options[1]);

    const calls = onPick.mock.calls;
    const picked = calls[calls.length - 1][0] as UserAddress;
    expect(picked.id).toBe('a2');
    expect(picked.label).toBe('Work');
  });
});
