/**
 * The journey list with the schema answering, the meeting actions carried
 * through to a finished write, the surface hook's guard and the products gate.
 *
 * Roles win over meeting history (an approved host with an old meeting row is
 * still approved), a pending meeting on another journey gets its actions, and a
 * finished cancel tells the page to refetch — which must not throw even when
 * that refetch fails.
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { EARN_KINDS } from '@duncit/onboarding';
import EarnJourneyList from '../src/EarnJourneyList';
import EarnMeetingActions from '../src/EarnMeetingActions';
import { useEarnSurface } from '../src/EarnSurfaceProvider';
import { EARN_ME, PUBLIC_FEATURE_FLAGS } from '../src/queries';
import { useEarnProductsVisible } from '../src/useEarnProductsVisible';
import {
  LABELS,
  SLOT_CURRENT,
  SLOT_OPEN,
  buildConfig,
  cancelMock,
  meetingSlotsMock,
  pressEscape,
  rescheduleMock,
  settle,
  submitReason,
  tile,
  wrap,
} from './test-utils';

const REASON = 'Clashes with work';

afterEach(() => {
  vi.clearAllMocks();
});

describe('useEarnSurface', () => {
  function Bare() {
    useEarnSurface();
    return null;
  }

  it('fails loudly when a surface forgets its provider', () => {
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    expect(() => render(<Bare />)).toThrow('useEarnSurface must be used inside an EarnSurfaceProvider');

    quiet.mockRestore();
  });
});

describe('useEarnProductsVisible', () => {
  function Probe() {
    return <span data-testid="products">{useEarnProductsVisible() ? 'on' : 'off'}</span>;
  }

  const flagsMock = (flags: Array<{ key: string; enabled: boolean }>) => ({
    request: { query: PUBLIC_FEATURE_FLAGS },
    result: {
      data: { publicFeatureFlags: flags.map((flag) => ({ ...flag, __typename: 'PublicFeatureFlag' })) },
    },
  });

  it('is hidden until the flags arrive, then follows is_product_visible', async () => {
    wrap(<Probe />, [flagsMock([{ key: 'is_product_visible', enabled: true }])]);
    expect(screen.getByTestId('products')).toHaveTextContent('off');

    await settle();
    expect(screen.getByTestId('products')).toHaveTextContent('on');
  });

  it('stays hidden when the flag is absent from the list', async () => {
    wrap(<Probe />, [flagsMock([{ key: 'leaderboard', enabled: true }])]);
    await settle();

    expect(screen.getByTestId('products')).toHaveTextContent('off');
  });
});

describe('EarnMeetingActions', () => {
  const props = { kind: 'HOST', bookedAt: SLOT_CURRENT, rescheduleCount: 0 };

  it('opens and closes each dialog from its own button', async () => {
    wrap(<EarnMeetingActions {...props} onChanged={vi.fn()} />, [meetingSlotsMock()]);
    await settle();

    fireEvent.click(screen.getByText('Reschedule meeting'));
    await settle();
    expect(screen.getByText(LABELS.rescheduleTitle)).toBeInTheDocument();
    await pressEscape();
    await waitFor(() => expect(screen.queryByText(LABELS.rescheduleTitle)).not.toBeInTheDocument());

    fireEvent.click(screen.getByText('Cancel meeting'));
    await settle();
    expect(screen.getByText(LABELS.cancelTitle)).toBeInTheDocument();
    await pressEscape();
    await waitFor(() => expect(screen.queryByText(LABELS.cancelTitle)).not.toBeInTheDocument());
  });

  it('closes the reschedule dialog and tells the page once the move succeeds', async () => {
    const onChanged = vi.fn();
    wrap(<EarnMeetingActions {...props} onChanged={onChanged} />, [meetingSlotsMock(), rescheduleMock(REASON)]);
    await settle();

    fireEvent.click(screen.getByText('Reschedule meeting'));
    await settle();
    fireEvent.click(tile(SLOT_OPEN));
    await settle();
    await submitReason('reschedule-reason-form', REASON);

    await waitFor(() => expect(onChanged).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.queryByText(LABELS.rescheduleTitle)).not.toBeInTheDocument());
  });

  it('closes the cancel dialog and tells the page once the cancel succeeds', async () => {
    const onChanged = vi.fn();
    wrap(<EarnMeetingActions {...props} onChanged={onChanged} />, [cancelMock(REASON)]);
    await settle();

    fireEvent.click(screen.getByText('Cancel meeting'));
    await settle();
    await submitReason('cancel-reason-form', REASON);

    await waitFor(() => expect(onChanged).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.queryByText(LABELS.cancelTitle)).not.toBeInTheDocument());
  });
});

describe('EarnJourneyList with the schema answering', () => {
  const meeting = (over: Record<string, unknown>) => ({
    id: 'DUN-MTG-1',
    request_no: null,
    kind: 'VENUE',
    status: 'SCHEDULED',
    approval_status: null,
    onboarded_status: null,
    scheduled_at: null,
    requested_at: null,
    reschedule_count: null,
    __typename: 'OnboardingMeeting',
    ...over,
  });

  const earnMeMock = {
    request: { query: EARN_ME },
    result: {
      data: {
        me: { user_id: 'DUN-USR-4821', roles: ['HOST'], __typename: 'User' },
        myMeetings: [
          meeting({ id: 'DUN-MTG-1', request_no: 'REQ-77', kind: 'VENUE', scheduled_at: SLOT_CURRENT, reschedule_count: 0 }),
          meeting({ id: 'DUN-MTG-2', kind: 'ECOMM', requested_at: SLOT_CURRENT, reschedule_count: 1 }),
          meeting({ id: 'DUN-MTG-3', kind: 'CLUB_ADMIN', status: 'REQUESTED' }),
        ],
      },
    },
  };

  it('offers the approved next step, and the actions on every pending meeting', async () => {
    const runCta = vi.fn();
    wrap(<EarnJourneyList showProducts kinds={EARN_KINDS} />, [earnMeMock], buildConfig({ runCta }));
    await settle();

    fireEvent.click(screen.getByRole('button', { name: 'Ready to host more experiences?' }));
    expect(runCta).toHaveBeenCalledWith(expect.objectContaining({ target: 'internal', internalTo: '/host/manage' }));

    // Venue + club keep their one reschedule; ecomm has spent it.
    expect(screen.getAllByText('Cancel meeting')).toHaveLength(3);
    expect(screen.getAllByText('Reschedule meeting')).toHaveLength(2);
    expect(screen.getByText('You have already used your one-time reschedule option.')).toBeInTheDocument();
  });

  it('asks the page to refetch after a cancel, and survives that refetch failing', async () => {
    wrap(<EarnJourneyList showProducts kinds={EARN_KINDS} />, [earnMeMock, cancelMock(REASON, 'VENUE')]);
    await settle();

    // The first pending card in journey order is the venue.
    fireEvent.click(screen.getAllByText('Cancel meeting')[0]);
    await settle();
    expect(screen.getByText(LABELS.cancelTitle)).toBeInTheDocument();

    await submitReason('cancel-reason-form', REASON);

    // The dialog closed on success; the refetch behind it had no mock to answer
    // it and was swallowed rather than crashing the page.
    await waitFor(() => expect(screen.queryByText(LABELS.cancelTitle)).not.toBeInTheDocument());
    expect(screen.getByText('By registering your venue')).toBeInTheDocument();
  });
});
