import { screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { downloadText } from '../../../../lib/csv';
import { GuestsTab } from '../../../../pages/manage/guests';
import { captureNotifications, meFixture, registrationFixture, renderWithProviders, typed } from '../../../test-utils';
import { apiRefusal, guestActionMock, hostedEvent, registrationsMock } from '../manage-mocks';

vi.mock('../../../../lib/csv', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../../lib/csv')>()),
  downloadText: vi.fn(),
}));

const me = meFixture();
const ravi = registrationFixture();
const pendingMeera = registrationFixture({
  id: 'reg-2',
  code: 'XYZ789',
  status: 'PENDING_APPROVAL',
  user: typed('LiteRegistrationUser', { id: 'u-3', name: 'Meera Shah', email: 'meera@example.com', phone: null, handle: 'meera', avatar_url: null }),
});

describe('GuestsTab', () => {
  let toasts: ReturnType<typeof captureNotifications>;

  beforeEach(() => {
    toasts = captureNotifications();
  });

  afterEach(() => {
    toasts.stop();
    vi.mocked(downloadText).mockReset();
  });

  it('says nobody matches yet and keeps export off while the list is empty', async () => {
    renderWithProviders(<GuestsTab event={hostedEvent()} onChanged={vi.fn()} />, { me, mocks: [registrationsMock({}, [])] });

    expect(await screen.findByText('No guests here')).toBeInTheDocument();
    expect(screen.getByText('Nobody matches this filter yet.')).toBeInTheDocument();
    expect(screen.getByTestId('guests-export')).toBeDisabled();
  });

  it('lists the guests and exports them as <slug>-guests.csv', async () => {
    const { user } = renderWithProviders(<GuestsTab event={hostedEvent()} onChanged={vi.fn()} />, { me, mocks: [registrationsMock({}, [ravi, pendingMeera])] });

    expect(await screen.findByRole('table', { name: 'Guest list' })).toBeInTheDocument();
    expect(screen.getAllByTestId('guest-row')).toHaveLength(2);

    await user.click(screen.getByTestId('guests-export'));

    expect(downloadText).toHaveBeenCalledTimes(1);
    const [fileName, text] = vi.mocked(downloadText).mock.calls[0];
    expect(fileName).toBe('garden-party-guests.csv');
    expect(text).toContain('Ravi Kumar,ravi@example.com');
    expect(text).toContain('Meera Shah,meera@example.com');
  });

  it('filters by status from a labelled chip group', async () => {
    const { user } = renderWithProviders(<GuestsTab event={hostedEvent()} onChanged={vi.fn()} />, {
      me,
      mocks: [registrationsMock({}, [ravi, pendingMeera]), registrationsMock({ status: 'PENDING_APPROVAL' }, [pendingMeera])],
    });
    await screen.findByRole('table', { name: 'Guest list' });

    const filters = screen.getByRole('group', { name: 'Filter by status' });
    await user.click(within(filters).getByText('Pending approval'));

    expect(await screen.findByText('Meera Shah')).toBeInTheDocument();
    await vi.waitFor(() => expect(screen.getAllByTestId('guest-row')).toHaveLength(1));
    expect(screen.queryByText('Ravi Kumar')).not.toBeInTheDocument();
  });

  it('searches by name once typing settles', async () => {
    const { user } = renderWithProviders(<GuestsTab event={hostedEvent()} onChanged={vi.fn()} />, {
      me,
      mocks: [registrationsMock({}, [ravi, pendingMeera]), registrationsMock({ search: 'meera' }, [pendingMeera])],
    });
    await screen.findByRole('table', { name: 'Guest list' });

    await user.type(screen.getByRole('searchbox', { name: 'Search by name or email' }), '  meera ');

    await vi.waitFor(() => expect(screen.getAllByTestId('guest-row')).toHaveLength(1));
    expect(screen.getByText('Meera Shah')).toBeInTheDocument();
  });

  it('runs a non-destructive action at once, confirms it and reloads the list', async () => {
    const onChanged = vi.fn();
    const approved = { ...pendingMeera, status: 'CONFIRMED' as const };
    const { user } = renderWithProviders(<GuestsTab event={hostedEvent()} onChanged={onChanged} />, {
      me,
      mocks: [registrationsMock({}, [pendingMeera], 2), guestActionMock('reg-2', 'APPROVE', approved)],
    });

    await user.click(await screen.findByRole('button', { name: 'Actions for Meera Shah' }));
    await user.click(screen.getByRole('menuitem', { name: 'Approve' }));

    await vi.waitFor(() => expect(onChanged).toHaveBeenCalledTimes(1));
    expect(screen.queryByTestId('confirm-dialog')).not.toBeInTheDocument();
    expect(toasts.seen).toEqual([{ message: 'Updated Meera Shah.', severity: 'success' }]);
  });

  it('asks before removing a guest and does nothing when the host backs out', async () => {
    const onChanged = vi.fn();
    const { user } = renderWithProviders(<GuestsTab event={hostedEvent()} onChanged={onChanged} />, { me, mocks: [registrationsMock({}, [ravi])] });

    await user.click(await screen.findByRole('button', { name: 'Actions for Ravi Kumar' }));
    await user.click(screen.getByRole('menuitem', { name: 'Remove' }));

    const dialog = await screen.findByTestId('confirm-dialog');
    expect(within(dialog).getByText('This applies to Ravi Kumar. Continue?')).toBeInTheDocument();
    await user.click(within(dialog).getByTestId('confirm-dialog-cancel'));

    await vi.waitFor(() => expect(screen.queryByTestId('confirm-dialog')).not.toBeInTheDocument());
    expect(onChanged).not.toHaveBeenCalled();
    expect(toasts.seen).toEqual([]);
  });

  it('removes a guest once the host confirms', async () => {
    const onChanged = vi.fn();
    const { user } = renderWithProviders(<GuestsTab event={hostedEvent()} onChanged={onChanged} />, {
      me,
      mocks: [registrationsMock({}, [ravi], 2), guestActionMock('reg-1', 'REMOVE', { ...ravi, status: 'CANCELLED' })],
    });

    await user.click(await screen.findByRole('button', { name: 'Actions for Ravi Kumar' }));
    await user.click(screen.getByRole('menuitem', { name: 'Remove' }));
    await user.click(within(await screen.findByTestId('confirm-dialog')).getByRole('button', { name: 'Remove' }));

    await vi.waitFor(() => expect(onChanged).toHaveBeenCalledTimes(1));
    expect(toasts.seen).toEqual([{ message: 'Updated Ravi Kumar.', severity: 'success' }]);
  });

  it('shows the API refusal and leaves the page as it was when an action fails', async () => {
    const onChanged = vi.fn();
    const { user } = renderWithProviders(<GuestsTab event={hostedEvent()} onChanged={onChanged} />, {
      me,
      mocks: [registrationsMock({}, [ravi]), guestActionMock('reg-1', 'CHECK_IN', apiRefusal('Check-in has not opened yet'))],
    });

    await user.click(await screen.findByRole('button', { name: 'Actions for Ravi Kumar' }));
    await user.click(screen.getByRole('menuitem', { name: 'Check in' }));

    await vi.waitFor(() => expect(toasts.seen).toEqual([{ message: 'Check-in has not opened yet', severity: 'error' }]));
    expect(onChanged).not.toHaveBeenCalled();
  });

  it('shows why the list could not load', async () => {
    renderWithProviders(<GuestsTab event={hostedEvent()} onChanged={vi.fn()} />, {
      me,
      mocks: [{ ...registrationsMock({}, []), result: apiRefusal('Only hosts can see the guest list') }],
    });

    expect(await screen.findByTestId('query-guard-error')).toHaveTextContent('Only hosts can see the guest list');
  });
});
