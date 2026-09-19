import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, screen } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { renderWithProviders } from '../../../__tests__/testkit';
import { ADMIN_ME } from '../../../adminSession';
import TypingWelcome from '../TypingWelcome';

const STEP_MS = 65;

const meMock: MockedResponse = {
  request: { query: ADMIN_ME },
  result: {
    data: {
      me: {
        __typename: 'User',
        user_id: 'u-admin-1',
        first_name: 'Asha',
        last_name: 'Rao',
        full_name: 'Asha Rao',
        email: 'asha.rao@duncit.com',
        phone_number: '9000000000',
        phone_extension: '+91',
        country: 'India',
        city: 'Bengaluru',
        zone: 'Indiranagar',
        profile_photo: '',
        bio: '',
        roles: ['USER', 'SUPER_ADMIN'],
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
      },
    },
  },
};

/** The visible (aria-hidden) half of the heading — the typed text. */
const typed = () => screen.getByRole('heading', { level: 1 }).querySelector('span[aria-hidden="true"]');

const tick = async (ms: number) => {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
};

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('TypingWelcome', () => {
  it('types the greeting out one character at a time, then stops', async () => {
    renderWithProviders(<TypingWelcome />);
    // Screen readers get the whole greeting at once.
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Welcome Admin');

    await tick(STEP_MS * 3);
    expect(typed()).toHaveTextContent('Wel');

    await tick(STEP_MS * 'Welcome Admin'.length);
    expect(typed()?.textContent).toBe('Welcome Admin');

    // The interval cleared itself once the greeting was complete.
    await tick(STEP_MS * 10);
    expect(typed()?.textContent).toBe('Welcome Admin');
  });

  it('restarts the greeting with the admin’s name once the session loads', async () => {
    renderWithProviders(<TypingWelcome />, { mocks: [meMock] });

    // Let the session query answer (and React re-render) before timing the typing.
    await tick(10);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Welcome Asha Rao');

    await tick(STEP_MS * 'Welcome Asha Rao'.length + STEP_MS);
    expect(typed()?.textContent).toBe('Welcome Asha Rao');
  });
});
