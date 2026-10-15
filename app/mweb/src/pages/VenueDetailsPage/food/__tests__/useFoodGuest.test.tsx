import type { ReactNode } from 'react';
import { renderHook } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing/react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { FOOD_ORDER_LIMITS } from '@duncit/utils';
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
afterEach(() => localStorage.clear());

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
