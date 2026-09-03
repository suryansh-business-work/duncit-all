/**
 * Taking an enrolment back — the dialog, and the Cancel that opens it.
 *
 * The offer depends on more partners than the one leaving, so the dialog must
 * say so in the product's own words and state the Account Health cost before
 * the button; the button itself must appear only while there is something to
 * take back. Neither may report a withdrawal the server never confirmed.
 */
import type { ReactNode } from 'react';
import { type MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { mwebAutoPodLabels, type AutoPodRow } from '@duncit/utils';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AutoPodWithdrawAction } from '../src/AutoPodWithdrawAction';
import { AutoPodWithdrawDialog } from '../src/AutoPodWithdrawDialog';
import { HOST_WITHDRAW_AUTO_POD, VENUE_WITHDRAW_AUTO_POD } from '../src/queries';

const t = (key: string, options?: { vars?: Record<string, string | number> }) =>
  options?.vars ? `${key}:${Object.values(options.vars).join(',')}` : key;
const labels = mwebAutoPodLabels(t);
const testTheme = createTheme();

const settle = async () => {
  await act(async () => {
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
  });
};

const VENUE_CLAIM = {
  venue_id: 'v-1',
  venue_slot_id: 'slot-1',
  owner_user_id: 'owner-1',
  venue_name: 'Indiranagar Court',
  pod_date_time: '2026-09-01T10:00:00.000Z',
  pod_end_date_time: null,
  slot_price: 500,
  accepted_at: '2026-08-20T10:00:00.000Z',
};
const HOST_CLAIM = { user_id: 'h-1', host_name: 'Asha Rao', assigned_at: '2026-08-21T10:00:00.000Z' };

/** A row the viewer enrolled in as a venue, still enrolling, with the penalty attached. */
const row = (over: Partial<AutoPodRow> = {}): AutoPodRow =>
  (({
    id: 'ap-1',
    auto_pod_no: 'DUN-AP-001',
    stage: 'CLAIMING',
    pod_title: 'Weekly Badminton',
    pod_description: 'Doubles, all levels.',
    pod_images_and_videos: [],
    sub_category_id: 'sub-1',
    category_name: 'Badminton',
    pod_amount: 250,
    no_of_spots: 8,
    venue_claim: VENUE_CLAIM,
    host_claim: null,
    club_claim: null,
    location: null,
    viewer_claimed: true,
    pod_id: null,
    expected_host_earnings: null,
    withdraw_penalty_points: 5,
    ...over,
  }) as AutoPodRow);

const wrap = (ui: ReactNode, mocks: readonly MockedResponse[] = []) =>
  render(
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={[...mocks]}>
      <ThemeProvider theme={testTheme}>{ui}</ThemeProvider>
    </MockedProvider>,
  );

const press = async (name: string) => {
  fireEvent.click(screen.getByRole('button', { name }));
  await settle();
};

const venueWithdrawMock = (over: Partial<MockedResponse> = {}): MockedResponse =>
  ({
    request: { query: VENUE_WITHDRAW_AUTO_POD, variables: { auto_pod_doc_id: 'ap-1' } },
    result: { data: { venueWithdrawAutoPod: null } },
    ...over,
  }) as MockedResponse;

const hostWithdrawMock = (): MockedResponse => ({
  request: { query: HOST_WITHDRAW_AUTO_POD, variables: { auto_pod_doc_id: 'ap-1' } },
  result: { data: { hostWithdrawAutoPod: null } },
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('AutoPodWithdrawDialog', () => {
  const props = { labels, onClose: vi.fn(), onWithdrawn: vi.fn() };

  it('renders nothing while it is closed', () => {
    wrap(<AutoPodWithdrawDialog {...props} row={row()} role="venue" open={false} />);

    expect(document.body.querySelector('[role="dialog"]')).toBeNull();
  });

  // The warning is the product's own sentence, and the cost is the number Pod
  // Settings sent on the row — both before the button, never after.
  it('warns that the offer depends on more partners, and states the cost', async () => {
    wrap(<AutoPodWithdrawDialog {...props} row={row()} role="venue" open />);
    await settle();

    expect(document.body.textContent).toContain('Weekly Badminton');
    expect(document.body.textContent).toContain(labels.withdrawWarning);
    expect(document.body.textContent).toContain(labels.withdrawPenalty(5));
  });

  it('names no cost when the penalty is switched off', async () => {
    wrap(<AutoPodWithdrawDialog {...props} row={row({ withdraw_penalty_points: 0 })} role="venue" open />);
    await settle();

    expect(document.body.textContent).toContain(labels.withdrawWarning);
    expect(document.body.textContent).not.toContain('mweb.autoPods.withdrawPenalty');
  });

  it('takes a venue’s slot back through the venue mutation', async () => {
    const onWithdrawn = vi.fn();
    wrap(<AutoPodWithdrawDialog {...props} onWithdrawn={onWithdrawn} row={row()} role="venue" open />, [
      venueWithdrawMock(),
    ]);
    await settle();

    await press(labels.withdrawConfirm);

    expect(onWithdrawn).toHaveBeenCalledTimes(1);
  });

  it('takes a host’s assignment back through the host mutation', async () => {
    const onWithdrawn = vi.fn();
    wrap(
      <AutoPodWithdrawDialog
        {...props}
        onWithdrawn={onWithdrawn}
        row={row({ host_claim: HOST_CLAIM })}
        role="host"
        open
      />,
      [hostWithdrawMock()],
    );
    await settle();

    await press(labels.withdrawConfirm);

    expect(onWithdrawn).toHaveBeenCalledTimes(1);
  });

  it('shows the server’s refusal and reports nothing', async () => {
    const onWithdrawn = vi.fn();
    wrap(<AutoPodWithdrawDialog {...props} onWithdrawn={onWithdrawn} row={row()} role="venue" open />, [
      venueWithdrawMock({ result: undefined, error: new Error('This Auto Pod is no longer enrolling.') }),
    ]);
    await settle();

    await press(labels.withdrawConfirm);

    expect(document.body.textContent).toContain('This Auto Pod is no longer enrolling.');
    expect(onWithdrawn).not.toHaveBeenCalled();
  });

  it('closes on dismiss', async () => {
    const onClose = vi.fn();
    wrap(<AutoPodWithdrawDialog {...props} onClose={onClose} row={row()} role="venue" open />);
    await settle();

    await press(labels.dismiss);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  // A dialog opened before its row arrived still draws its buttons. Pressing
  // one must do nothing rather than send a mutation with no Auto Pod behind it.
  it('sends nothing when pressed before its row arrived', async () => {
    const onWithdrawn = vi.fn();
    wrap(<AutoPodWithdrawDialog {...props} onWithdrawn={onWithdrawn} row={null} role="venue" open />);
    await settle();

    await press(labels.withdrawConfirm);

    expect(onWithdrawn).not.toHaveBeenCalled();
  });
});

describe('AutoPodWithdrawAction', () => {
  const props = { labels, onWithdrawn: vi.fn() };

  it('draws the Cancel on an enrolling offer the viewer accepted', () => {
    wrap(<AutoPodWithdrawAction {...props} row={row()} role="venue" />);

    expect(screen.getByTestId('auto-pod-withdraw')).toHaveTextContent(labels.withdrawCta);
  });

  // The club admin's claim completes the pod: there is nothing to leave after
  // it, and nothing to leave on a row this viewer never enrolled in.
  it('draws nothing once the pod is live, on someone else’s row, or for a club admin', () => {
    const { container, rerender } = wrap(
      <AutoPodWithdrawAction {...props} row={row({ stage: 'LIVE' })} role="venue" />,
    );
    expect(container.textContent).toBe('');

    rerender(<AutoPodWithdrawAction {...props} row={row({ viewer_claimed: false })} role="venue" />);
    expect(container.textContent).toBe('');

    rerender(<AutoPodWithdrawAction {...props} row={row({ host_claim: null })} role="host" />);
    expect(container.textContent).toBe('');
  });

  it('opens the confirmation, and passes the withdrawal through', async () => {
    const onWithdrawn = vi.fn();
    wrap(<AutoPodWithdrawAction {...props} onWithdrawn={onWithdrawn} row={row()} role="venue" />, [
      venueWithdrawMock(),
    ]);

    expect(document.body.querySelector('[role="dialog"]')).toBeNull();
    fireEvent.click(screen.getByTestId('auto-pod-withdraw'));
    await settle();
    expect(document.body.textContent).toContain(labels.withdrawWarning);

    await press(labels.withdrawConfirm);

    expect(onWithdrawn).toHaveBeenCalledTimes(1);
  });

  it('closes the confirmation on dismiss without withdrawing', async () => {
    const onWithdrawn = vi.fn();
    wrap(<AutoPodWithdrawAction {...props} onWithdrawn={onWithdrawn} row={row()} role="venue" />);

    fireEvent.click(screen.getByTestId('auto-pod-withdraw'));
    await settle();
    await press(labels.dismiss);

    expect(onWithdrawn).not.toHaveBeenCalled();
  });
});
