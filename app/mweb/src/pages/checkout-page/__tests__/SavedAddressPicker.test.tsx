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

  it('fires onPick with the chosen address and shows the default suffix', async () => {
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

    fireEvent.click(options[0]);

    expect(onPick).toHaveBeenCalledTimes(1);
    const picked = (onPick.mock.calls[0][0] as UserAddress);
    expect(picked.id).toBe('a1');
    expect(picked.label).toBe('Home');
  });
});
