/**
 * The address card — the fields it renders come from ADDRESS_FIELDS, and the
 * submit path is refused for exactly the values `isAddressComplete` refuses.
 */
import { type MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import AddressCard from '../src/mui/AddressCard';
import { SUBMIT_ADDRESS_VERIFICATION } from '../src/mui/queries';
import type { Verification } from '../src';

const row = (over: Partial<Verification> = {}): Verification => ({
  type: 'ADDRESS',
  status: 'NOT_SUBMITTED',
  document_url: null,
  reject_reason: null,
  address: null,
  ...over,
});

const submitted = {
  line1: '12 Turner Road',
  line2: undefined,
  city: 'Mumbai',
  state: 'Maharashtra',
  pincode: '400050',
  country: undefined,
};

const okMock: MockedResponse = {
  request: { query: SUBMIT_ADDRESS_VERIFICATION, variables: submitted },
  result: { data: { submitAddressVerification: { type: 'ADDRESS', status: 'PENDING' } } },
};

const failMock: MockedResponse = {
  request: { query: SUBMIT_ADDRESS_VERIFICATION, variables: submitted },
  error: new Error('Address service is down'),
};

function setup(item: Verification, mocks: MockedResponse[] = [okMock]) {
  const onChanged = vi.fn();
  const onError = vi.fn();
  render(
    <MockedProvider mocks={mocks}>
      <AddressCard item={item} onChanged={onChanged} onError={onError} />
    </MockedProvider>,
  );
  return { onChanged, onError };
}

const type = (label: string | RegExp, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });

const fillRequired = () => {
  type('Address line 1', '12 Turner Road');
  type('State', 'Maharashtra');
  type('City', 'Mumbai');
  type('Pincode', '400050');
};

describe('AddressCard', () => {
  it('renders every field the shared table describes', () => {
    setup(row());
    for (const label of [
      'Address line 1',
      'Address line 2 (optional)',
      'State',
      'City',
      'Pincode',
      'Country (optional)',
    ]) {
      expect(screen.getByLabelText(label)).toBeInTheDocument();
    }
  });

  it('seeds the form from the address already on file', () => {
    setup(
      row({
        status: 'REJECTED',
        reject_reason: 'Pincode does not match the city',
        address: {
          line1: '12 Turner Road',
          line2: 'Flat 4B',
          city: 'Mumbai',
          state: 'Maharashtra',
          pincode: '400050',
          country: 'India',
        },
      }),
    );
    expect(screen.getByLabelText('Address line 1')).toHaveValue('12 Turner Road');
    expect(screen.getByLabelText('Country (optional)')).toHaveValue('India');
    expect(screen.getByText('Pincode does not match the city')).toBeInTheDocument();
  });

  it('takes the form away while approved', () => {
    setup(row({ status: 'APPROVED' }));
    expect(screen.queryByLabelText('Address line 1')).not.toBeInTheDocument();
  });

  it('takes the form away while under review', () => {
    setup(row({ status: 'PENDING' }));
    expect(screen.queryByLabelText('Address line 1')).not.toBeInTheDocument();
  });

  it('refuses an incomplete address before it reaches the server', async () => {
    const { onChanged, onError } = setup(row());
    type('Address line 1', '12 Turner Road');
    fireEvent.click(screen.getByRole('button', { name: 'Submit address' }));

    await waitFor(() =>
      expect(onError).toHaveBeenCalledWith(
        'Address line, city, state and pincode are required.',
      ),
    );
    expect(onChanged).not.toHaveBeenCalled();
  });

  it('submits a complete address and tells the host to refetch', async () => {
    const { onChanged, onError } = setup(row());
    fillRequired();
    fireEvent.click(screen.getByRole('button', { name: 'Submit address' }));

    await waitFor(() => expect(onChanged).toHaveBeenCalledTimes(1));
    expect(onError).not.toHaveBeenCalled();
  });

  it('surfaces a server failure to the host', async () => {
    const { onChanged, onError } = setup(row(), [failMock]);
    fillRequired();
    fireEvent.click(screen.getByRole('button', { name: 'Submit address' }));

    await waitFor(() => expect(onError).toHaveBeenCalledWith('Address service is down'));
    expect(onChanged).not.toHaveBeenCalled();
  });
});
