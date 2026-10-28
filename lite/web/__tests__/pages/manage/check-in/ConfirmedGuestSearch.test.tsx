import { screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ConfirmedGuestSearch } from '../../../../pages/manage/check-in/ConfirmedGuestSearch';
import { captureNotifications, registrationFixture, renderWithProviders, typed } from '../../../test-utils';
import { apiRefusal, guestActionMock, registrationsMock } from '../manage-mocks';

const ravi = registrationFixture({ quantity: 2 });
const meera = registrationFixture({
  id: 'reg-2',
  code: 'XYZ789',
  checked_in_at: '2026-11-21T14:00:00.000Z',
  user: typed('LiteRegistrationUser', { id: 'u-3', name: 'Meera Shah', email: 'meera@example.com', phone: null, handle: 'meera', avatar_url: null }),
});

describe('ConfirmedGuestSearch', () => {
  let toasts: ReturnType<typeof captureNotifications>;

  beforeEach(() => {
    toasts = captureNotifications();
  });

  afterEach(() => {
    toasts.stop();
  });

  it('lists confirmed guests with their ticket and code, and marks who is already in', async () => {
    renderWithProviders(<ConfirmedGuestSearch eventId="ev-1" onCheckedIn={vi.fn()} />, { mocks: [registrationsMock({ status: 'CONFIRMED' }, [ravi, meera])] });

    expect(await screen.findByText('Ravi Kumar')).toBeInTheDocument();
    expect(screen.getByText('General × 2 · ABC123')).toBeInTheDocument();
    expect(screen.getByTestId('check-in-guest-reg-1')).toHaveTextContent('Check in');
    expect(screen.queryByTestId('check-in-guest-reg-2')).not.toBeInTheDocument();
    const meeraRow = screen.getByText('Meera Shah').closest('li');
    expect(meeraRow).not.toBeNull();
    if (meeraRow) expect(within(meeraRow).getByText('Checked in')).toBeInTheDocument();
  });

  it('says when no confirmed guest matches', async () => {
    renderWithProviders(<ConfirmedGuestSearch eventId="ev-1" onCheckedIn={vi.fn()} />, { mocks: [registrationsMock({ status: 'CONFIRMED' }, [])] });

    expect(await screen.findByText('No confirmed guests match.')).toBeInTheDocument();
  });

  it('searches the confirmed list by name once typing settles', async () => {
    const { user } = renderWithProviders(<ConfirmedGuestSearch eventId="ev-1" onCheckedIn={vi.fn()} />, {
      mocks: [registrationsMock({ status: 'CONFIRMED' }, [ravi, meera]), registrationsMock({ status: 'CONFIRMED', search: 'ravi' }, [ravi])],
    });
    await screen.findByText('Meera Shah');

    await user.type(screen.getByRole('searchbox', { name: 'Search confirmed guests' }), 'ravi');

    await vi.waitFor(() => expect(screen.queryByText('Meera Shah')).not.toBeInTheDocument());
    expect(screen.getByText('Ravi Kumar')).toBeInTheDocument();
  });

  it('checks a guest in from the list, reports them and refreshes', async () => {
    const onCheckedIn = vi.fn();
    const checkedIn = { ...ravi, checked_in_at: '2026-11-21T14:05:00.000Z' };
    const { user } = renderWithProviders(<ConfirmedGuestSearch eventId="ev-1" onCheckedIn={onCheckedIn} />, {
      mocks: [registrationsMock({ status: 'CONFIRMED' }, [ravi], 2), guestActionMock('reg-1', 'CHECK_IN', checkedIn)],
    });

    await user.click(await screen.findByTestId('check-in-guest-reg-1'));

    await vi.waitFor(() => expect(toasts.seen).toEqual([{ message: 'Checked in Ravi Kumar.', severity: 'success' }]));
    expect(onCheckedIn).toHaveBeenCalledWith(expect.objectContaining({ id: 'reg-1', checked_in_at: '2026-11-21T14:05:00.000Z' }));
  });

  it('shows the refusal and reports nobody when the check-in fails', async () => {
    const onCheckedIn = vi.fn();
    const { user } = renderWithProviders(<ConfirmedGuestSearch eventId="ev-1" onCheckedIn={onCheckedIn} />, {
      mocks: [registrationsMock({ status: 'CONFIRMED' }, [ravi]), guestActionMock('reg-1', 'CHECK_IN', apiRefusal('Check-in has closed'))],
    });

    await user.click(await screen.findByTestId('check-in-guest-reg-1'));

    await vi.waitFor(() => expect(toasts.seen).toEqual([{ message: 'Check-in has closed', severity: 'error' }]));
    expect(onCheckedIn).not.toHaveBeenCalled();
  });

  it('shows why the list could not load', async () => {
    renderWithProviders(<ConfirmedGuestSearch eventId="ev-1" onCheckedIn={vi.fn()} />, {
      mocks: [{ ...registrationsMock({ status: 'CONFIRMED' }, []), result: apiRefusal('Only hosts can check guests in') }],
    });

    expect(await screen.findByTestId('query-guard-error')).toHaveTextContent('Only hosts can check guests in');
  });
});
