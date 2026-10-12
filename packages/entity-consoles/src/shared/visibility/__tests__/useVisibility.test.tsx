import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { PUBLIC_APP_SETTINGS } from '@duncit/app-settings';
import { renderWithProviders } from '../../../../__tests__/testkit';
import { SET_CLUB_HIDDEN, SET_POD_HIDDEN } from '../queries';
import { useVisibility, type VisibilityKind, type VisibilityTarget } from '../useVisibility';

// The localization provider keeps this query active, and a successful hide
// refetches every active query — so it must have an answer.
const publicSettingsMock = (): MockedResponse => ({
  request: { query: PUBLIC_APP_SETTINGS },
  maxUsageCount: Number.POSITIVE_INFINITY,
  result: {
    data: {
      publicAppSettings: {
        __typename: 'PublicAppSettings',
        date_format: 'dd/MM/yyyy',
        time_format: 'HH:mm',
        time_zone: 'Asia/Kolkata',
        time_source: 'SERVER',
        custom_time: null,
        custom_time_set_at: null,
        server_time: '2024-05-17T04:00:37.000Z',
        min_signup_age: 13,
        draft_retention_days: 30,
        ticket_discount_max_pct: 50,
        happening_nearby_days: 7,
      },
    },
  },
});

const TARGET: VisibilityTarget = { id: 'rec1', name: 'Chess Night', hidden: false };

function Harness({
  kind,
  target,
  onChanged,
}: Readonly<{ kind: VisibilityKind; target: VisibilityTarget; onChanged?: () => void }>) {
  const controls = useVisibility(kind, onChanged);
  return (
    <>
      <button type="button" onClick={() => void controls.request(target)}>
        request
      </button>
      {controls.dialog}
    </>
  );
}

const hideMock = (kind: VisibilityKind, hidden: boolean, reason: string | null): MockedResponse => {
  const query = kind === 'CLUB' ? SET_CLUB_HIDDEN : SET_POD_HIDDEN;
  const field = kind === 'CLUB' ? 'setClubHidden' : 'setPodHidden';
  const record =
    kind === 'CLUB'
      ? { __typename: 'Club', id: 'rec1', is_hidden: hidden, hidden_reason: reason }
      : {
          __typename: 'Pod',
          id: 'rec1',
          is_hidden: hidden,
          hidden_by_club: false,
          hidden_reason: reason,
          club_hidden_reason: null,
        };
  return {
    request: { query, variables: { id: 'rec1', hidden, reason } },
    result: { data: { [field]: record } },
  };
};

const failingMock = (kind: VisibilityKind, error: Error): MockedResponse => ({
  request: {
    query: kind === 'CLUB' ? SET_CLUB_HIDDEN : SET_POD_HIDDEN,
    variables: { id: 'rec1', hidden: true, reason: 'Spam' },
  },
  error,
});

const openDialogAndSubmit = async (reason: string) => {
  fireEvent.click(screen.getByRole('button', { name: 'request' }));
  const dialog = await screen.findByRole('dialog');
  fireEvent.change(within(dialog).getByRole('textbox'), { target: { value: reason } });
  fireEvent.click(within(dialog).getByRole('button', { name: 'Hide' }));
  return dialog;
};

describe('useVisibility / hide', () => {
  it('asks for a reason naming the club, then hides it, toasts and tells the caller', async () => {
    const onChanged = vi.fn();
    renderWithProviders(<Harness kind="CLUB" target={TARGET} onChanged={onChanged} />, {
      mocks: [publicSettingsMock(), hideMock('CLUB', true, 'Spam')],
    });

    fireEvent.click(screen.getByRole('button', { name: 'request' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Hide this club?')).toBeInTheDocument();
    expect(within(dialog).getByText(/"Chess Night" and every pod in it/)).toBeInTheDocument();

    fireEvent.change(within(dialog).getByRole('textbox'), { target: { value: 'Spam' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Hide' }));

    expect(await screen.findByText('Club and its pods hidden.')).toBeInTheDocument();
    expect(onChanged).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('uses the pod copy and the pod mutation for a pod, and works without an onChanged', async () => {
    renderWithProviders(<Harness kind="POD" target={TARGET} />, {
      mocks: [publicSettingsMock(), hideMock('POD', true, 'Wrong venue')],
    });

    fireEvent.click(screen.getByRole('button', { name: 'request' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Hide this pod?')).toBeInTheDocument();
    fireEvent.change(within(dialog).getByRole('textbox'), { target: { value: 'Wrong venue' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Hide' }));

    expect(await screen.findByText('Pod hidden.')).toBeInTheDocument();
  });

  it('refuses a blank reason and sends nothing', async () => {
    renderWithProviders(<Harness kind="CLUB" target={TARGET} />, { mocks: [] });

    await openDialogAndSubmit('   ');

    expect(await screen.findByText('Enter a reason for hiding.')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.queryByText('Club and its pods hidden.')).not.toBeInTheDocument();
  });

  it('keeps the dialog open and shows the server message when the hide fails', async () => {
    const onChanged = vi.fn();
    renderWithProviders(<Harness kind="CLUB" target={TARGET} onChanged={onChanged} />, {
      mocks: [failingMock('CLUB', new Error('Only a governor may hide a club'))],
    });

    await openDialogAndSubmit('Spam');

    expect(await screen.findByText('Only a governor may hide a club')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(onChanged).not.toHaveBeenCalled();
  });

  it('falls back to the generic message when the failure carries none', async () => {
    renderWithProviders(<Harness kind="CLUB" target={TARGET} />, {
      mocks: [failingMock('CLUB', new Error(''))],
    });

    await openDialogAndSubmit('Spam');

    expect(
      await screen.findByText('Could not change the visibility. Please try again.'),
    ).toBeInTheDocument();
  });

  it('closes the dialog from Cancel without sending anything', async () => {
    renderWithProviders(<Harness kind="CLUB" target={TARGET} />, { mocks: [] });

    fireEvent.click(screen.getByRole('button', { name: 'request' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});

describe('useVisibility / show', () => {
  const hiddenTarget: VisibilityTarget = { ...TARGET, hidden: true };

  it('confirms, then shows the record again with no reason', async () => {
    const onChanged = vi.fn();
    renderWithProviders(<Harness kind="CLUB" target={hiddenTarget} onChanged={onChanged} />, {
      mocks: [publicSettingsMock(), hideMock('CLUB', false, null)],
    });

    fireEvent.click(screen.getByRole('button', { name: 'request' }));
    expect(await screen.findByText('Show this club again?')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Show' }));

    expect(await screen.findByText('Club and its pods are visible again.')).toBeInTheDocument();
    expect(onChanged).toHaveBeenCalledTimes(1);
  });

  it('does nothing when the confirmation is dismissed', async () => {
    const onChanged = vi.fn();
    renderWithProviders(<Harness kind="POD" target={hiddenTarget} onChanged={onChanged} />, {
      mocks: [],
    });

    fireEvent.click(screen.getByRole('button', { name: 'request' }));
    expect(await screen.findByText('Show this pod again?')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(screen.queryByText('Show this pod again?')).not.toBeInTheDocument());
    expect(onChanged).not.toHaveBeenCalled();
    expect(screen.queryByText('Pod is visible again.')).not.toBeInTheDocument();
  });
});
