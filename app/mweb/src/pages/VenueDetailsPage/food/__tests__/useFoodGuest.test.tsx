import type { ReactNode } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing/react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FOOD_ORDER_LIMITS } from '@duncit/utils';
import { CHECKOUT_ME } from '../../../checkout-page/queries';
import { useFoodGuest } from '../useFoodGuest';

// Signed out throughout: the account read is skipped without a token, so no mock answers it.
const guestAt = (url: string) =>
  renderHook(() => useFoodGuest(), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <MockedProvider mocks={[]}>
        <MemoryRouter initialEntries={[url]}>{children}</MemoryRouter>
      </MockedProvider>
    ),
  }).result.current;

beforeEach(() => localStorage.clear());
afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('useFoodGuest — the table from a sticker’s QR', () => {
  it('starts with the table the scanned link names, trimmed', () => {
    expect(guestAt('/venue/v1?table=%20T5%20').table).toBe('T5');
  });

  it('leaves the table empty when the link names none', () => {
    expect(guestAt('/venue/v1').table).toBe('');
    expect(guestAt('/venue/v1?table=').table).toBe('');
  });

  it('takes the first table when a link repeats it', () => {
    expect(guestAt('/venue/v1?table=7&table=9').table).toBe('7');
  });

  it('cuts an over-long table to what the checkout field accepts', () => {
    const long = 'x'.repeat(FOOD_ORDER_LIMITS.tableMax + 10);
    expect(guestAt(`/venue/v1?table=${long}`).table).toBe('x'.repeat(FOOD_ORDER_LIMITS.tableMax));
  });

  it('keeps the name and mobile this device last ordered with alongside the table', () => {
    localStorage.setItem('mweb_food_guest', JSON.stringify({ name: 'Asha', phone: '9876543210' }));
    const guest = guestAt('/venue/v1?table=Patio');
    expect(guest).toEqual(expect.objectContaining({ name: 'Asha', phone: '9876543210', table: 'Patio' }));
  });

  it('starts blank for a first-time guest with no table', () => {
    expect(guestAt('/venue/v1')).toEqual(expect.objectContaining({ name: '', phone: '', table: '' }));
  });
});

describe('useFoodGuest — a signed-in member', () => {
  const meAnswer = (me: { first_name: string | null; last_name: string | null; phone_number: string | null }) => ({
    request: { query: CHECKOUT_ME },
    result: {
      data: {
        me: { user_id: 'u1', email: 'asha@example.com', phone_extension: '+91', address: null, ...me },
      },
    },
  });

  const signedInGuest = (me: Parameters<typeof meAnswer>[0]) =>
    renderHook(() => useFoodGuest(), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <MockedProvider mocks={[meAnswer(me)]}>
          <MemoryRouter initialEntries={['/venue/v1']}>{children}</MemoryRouter>
        </MockedProvider>
      ),
    });

  it('fills the account’s full name and mobile over what the device remembered', async () => {
    localStorage.setItem('token', 'session-token');
    localStorage.setItem('mweb_food_guest', JSON.stringify({ name: 'Old Name', phone: '9000000000' }));
    const { result } = signedInGuest({ first_name: 'Asha', last_name: 'Rao', phone_number: '9876543210' });

    await waitFor(() => expect(result.current.name).toBe('Asha Rao'));
    expect(result.current.phone).toBe('9876543210');
  });

  it('keeps the device’s mobile when the account’s number is not one the form can take', async () => {
    localStorage.setItem('token', 'session-token');
    localStorage.setItem('mweb_food_guest', JSON.stringify({ name: 'Old Name', phone: '9000000000' }));
    const { result } = signedInGuest({ first_name: 'Asha', last_name: null, phone_number: '+4479460000' });

    await waitFor(() => expect(result.current.name).toBe('Asha'));
    expect(result.current.phone).toBe('9000000000');
  });

  it('treats blocked storage as signed out and starts blank instead of failing', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    expect(guestAt('/venue/v1')).toEqual(expect.objectContaining({ name: '', phone: '', table: '' }));
  });
});
