/**
 * The overflow menu on a host's own pod row, and the state machine behind it.
 *
 * Which rows appear is not decoration: a venue-rejected pod must not offer the
 * attendee-facing actions (there is nobody to scan and no page to send), a pod
 * that has not finished must not offer Complete (it would settle a door still
 * open), and a surface with no media route must not offer a link to a page that
 * would 404 for every guest who taps it.
 */
import type { ReactNode } from 'react';
import { MockedProvider } from '@apollo/client/testing/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { MenuList } from '@mui/material';
import HostPodActionsMenu from '../src/HostPodActionsMenu';
import PodLinkMenuItem from '../src/PodLinkMenuItem';
import PodSpotsField from '../src/PodSpotsField';
import { HostPodActionsProvider } from '../src/HostPodActionsProvider';
import { useHostPodActions } from '../src/useHostPodActions';
import { hostActionsConfig, labelsFor } from './host-actions-config';
import type { HostPodTarget } from '../src/types';

const testTheme = createTheme();
const labels = labelsFor();

const settle = async () => {
  await act(async () => {
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
  });
};

const wrap = (ui: ReactNode, over = {}) =>
  render(
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={[]}>
      <ThemeProvider theme={testTheme}>
        <HostPodActionsProvider {...hostActionsConfig(over)}>{ui}</HostPodActionsProvider>
      </ThemeProvider>
    </MockedProvider>
  );

const itemNames = () =>
  [...document.body.querySelectorAll<HTMLElement>('[role="menuitem"]')].map(
    (item) => item.textContent ?? '',
  );

afterEach(() => {
  vi.clearAllMocks();
});

describe('HostPodActionsMenu rows', () => {
  const spies = () => ({
    onScan: vi.fn(),
    onComplete: vi.fn(),
    onEdit: vi.fn(),
    onOpenFeedback: vi.fn(),
    onShareFeedback: vi.fn(),
    onCopyFeedback: vi.fn(),
    onCancel: vi.fn(),
  });

  const open = async (over: Record<string, unknown> = {}, config = {}) => {
    const handlers = spies();
    const { container } = wrap(
      <HostPodActionsMenu podTitle="Sunday Badminton" {...handlers} {...(over as never)} />,
      config,
    );
    fireEvent.click(container.querySelector('button') as HTMLElement);
    await settle();
    return handlers;
  };

  it('offers Complete only on a pod whose door is already shut', async () => {
    await open({ canComplete: true });
    expect(itemNames().some((name) => name.includes(labels.completePod))).toBe(true);

    cleanup();
    await open({ canComplete: false });
    expect(itemNames().some((name) => name.includes(labels.completePod))).toBe(false);
  });

  // No attendees to scan, no page worth sending — the venue refused the slot.
  it('drops every attendee-facing row on a venue-rejected pod', async () => {
    await open({ venueRejected: true, canComplete: true, onSeeAttendance: vi.fn() });

    const names = itemNames();
    expect(names.some((name) => name.includes(labels.scanTickets))).toBe(false);
    expect(names.some((name) => name.includes(labels.seeAttendance))).toBe(false);
    expect(names.some((name) => name.includes(labels.completePod))).toBe(false);
    expect(names.some((name) => name.includes(labels.feedbackLink))).toBe(false);
    // Editing and cancelling are exactly what is left to do with it.
    expect(names.some((name) => name.includes(labels.editPod))).toBe(true);
    expect(names.some((name) => name.includes(labels.cancelPod))).toBe(true);
  });

  it('offers the media link only when the surface can open, share AND copy it', async () => {
    const podMediaLabels = hostActionsConfig().podMediaLabels;
    await open({
      onOpenPodMedia: vi.fn(),
      onSharePodMedia: vi.fn(),
      onCopyPodMedia: vi.fn(),
    });
    expect(itemNames().some((name) => name.includes(podMediaLabels.pageTitle))).toBe(true);

    cleanup();
    await open({ onOpenPodMedia: vi.fn() });
    expect(itemNames().some((name) => name.includes(podMediaLabels.pageTitle))).toBe(false);
  });

  it('offers the club-admin card only on a surface that has one', async () => {
    await open({ onClubAdmin: vi.fn() });
    expect(itemNames().some((name) => name.includes(labels.clubAdmin))).toBe(true);

    cleanup();
    await open();
    expect(itemNames().some((name) => name.includes(labels.clubAdmin))).toBe(false);
  });

  it('reports the slot request to the surface that owns that page', async () => {
    const onSlotRequest = vi.fn();
    await open({ onSlotRequest });

    fireEvent.click(screen.getByText(labels.slotRequest));

    expect(onSlotRequest).toHaveBeenCalledTimes(1);
  });

  it('reports See attendance, Scan, Edit and Cancel to their own handlers', async () => {
    const onSeeAttendance = vi.fn();
    const handlers = await open({ onSeeAttendance, canComplete: true });

    for (const [text, spy] of [
      [labels.scanTickets, handlers.onScan],
      [labels.seeAttendance, onSeeAttendance],
      [labels.completePod, handlers.onComplete],
      [labels.editPod, handlers.onEdit],
      [labels.cancelPod, handlers.onCancel],
    ] as const) {
      fireEvent.click(screen.getByText(text));
      await settle();
      expect(spy, text).toHaveBeenCalledTimes(1);
      fireEvent.click(document.body.querySelector('button') as HTMLElement);
      await settle();
    }
  });

  it('closes itself when the host clicks away rather than choosing', async () => {
    await open();
    expect(document.body.querySelector('[role="menu"]')).not.toBeNull();

    fireEvent.keyDown(document.body.querySelector('[role="menu"]') as HTMLElement, {
      key: 'Escape',
    });
    await settle();

    expect(itemNames()).toEqual([]);
  });
});

describe('PodLinkMenuItem', () => {
  const row = () => {
    const spies = { onOpen: vi.fn(), onShare: vi.fn(), onCopy: vi.fn() };
    wrap(
      <MenuList>
        <PodLinkMenuItem
          icon={<span data-testid="icon" />}
          label="Rating form"
          shareLabel="Share rating link"
          copyLabel="Copy rating link"
          {...spies}
        />
      </MenuList>,
    );
    return spies;
  };

  it('opens the page when the row itself is clicked', () => {
    const spies = row();

    fireEvent.click(screen.getByText('Rating form'));

    expect(spies.onOpen).toHaveBeenCalledTimes(1);
  });

  // Copying the link must not also navigate away from the list the host is
  // working in.
  it('takes the link without opening the page', () => {
    const spies = row();

    fireEvent.click(screen.getByLabelText('Share rating link'));
    fireEvent.click(screen.getByLabelText('Copy rating link'));

    expect(spies.onShare).toHaveBeenCalledTimes(1);
    expect(spies.onCopy).toHaveBeenCalledTimes(1);
    expect(spies.onOpen).not.toHaveBeenCalled();
  });
});

describe('PodSpotsField', () => {
  const limits = (over: Record<string, unknown> = {}) => ({
    min: 2,
    max: 20,
    slidable: true,
    can_decrease: true,
    venue_capacity: 20,
    seats_taken: 4,
    ...over,
  });

  it('renders the range the server allowed, with the venue capacity behind it', () => {
    wrap(
      <PodSpotsField limits={limits() as never} labels={labels} value={8} onChange={vi.fn()} />,
    );

    expect(screen.getByText(labels.spotsVenueHint(20, 4))).toBeInTheDocument();
  });

  // A host may raise a live pod but never shrink it past the seats already sold.
  it('says the pod can only grow when the server refuses a decrease', () => {
    wrap(
      <PodSpotsField
        limits={limits({ can_decrease: false }) as never}
        labels={labels}
        value={8}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByText(labels.spotsIncreaseOnly)).toBeInTheDocument();
  });

  it('says nothing extra when the pod can move either way', () => {
    wrap(
      <PodSpotsField limits={limits() as never} labels={labels} value={8} onChange={vi.fn()} />,
    );

    expect(screen.queryByText(labels.spotsIncreaseOnly)).not.toBeInTheDocument();
  });

  it('shows what is wrong under the stepper', () => {
    wrap(
      <PodSpotsField
        limits={limits() as never}
        labels={labels}
        value={1}
        onChange={vi.fn()}
        error="Too few spots"
      />,
    );

    expect(screen.getByText('Too few spots')).toBeInTheDocument();
  });
});

describe('useHostPodActions', () => {
  const pod = (over: Partial<HostPodTarget> = {}): HostPodTarget =>
    (({
      id: 'pod-1',
      pod_title: 'Sunday Badminton',
      pod_description: 'Doubles at Court 2, all levels welcome.',
      pod_images_and_videos: [{ url: 'https://cdn.duncit.com/pod/a.jpg', type: 'IMAGE' }],
      pod_date_time: '2020-01-01T10:00:00.000Z',
      pod_end_date_time: '2020-01-01T12:00:00.000Z',
      venue_id: 'venue-1',
      venue_approval_status: 'APPROVED',
      ...over
    }) as HostPodTarget);

  /**
   * The dialogs are part of what the hook returns, so they are mounted inside
   * the same provider rather than rendered separately — a dialog outside it
   * throws by design (see useHostPodActionsConfig).
   */
  const mount = (onChanged = vi.fn(), config = {}) => {
    const api: { current: ReturnType<typeof useHostPodActions> | null } = { current: null };
    function Harness() {
      const actions = useHostPodActions(onChanged);
      api.current = actions;
      return <>{actions.dialogs}</>;
    }
    return { onChanged, api, ...wrap(<Harness />, config) };
  };

  it('reads the pod title and its venue state straight off the row', () => {
    const { api } = mount();

    const handlers = api.current!.menuHandlers(pod());

    expect(handlers.podTitle).toBe('Sunday Badminton');
    expect(handlers.venueRejected).toBe(false);
    // The pod is long over, so it may be completed.
    expect(handlers.canComplete).toBe(true);
  });

  it('marks a venue-rejected pod as such, and offers no completion on a future pod', () => {
    const { api } = mount();

    expect(api.current!.menuHandlers(pod({ venue_approval_status: 'DECLINED' })).venueRejected).toBe(
      true,
    );
    expect(
      api.current!.menuHandlers(pod({ pod_date_time: '2099-01-01T10:00:00.000Z', pod_end_date_time: null }))
        .canComplete,
    ).toBe(false);
  });

  // The whole media triple appears or none of it does: sharing a link to a page
  // this surface cannot open would send guests somewhere that 404s.
  it('offers the media triple only on a surface that owns that route', () => {
    const withRoute = mount(vi.fn(), { onOpenPodMedia: vi.fn() });
    const on = withRoute.api.current!.menuHandlers(pod());
    cleanup();
    const withoutRoute = mount(vi.fn(), { onOpenPodMedia: undefined });
    const off = withoutRoute.api.current!.menuHandlers(pod());

    expect([on.onOpenPodMedia, on.onSharePodMedia, on.onCopyPodMedia].every(Boolean)).toBe(true);
    expect([off.onOpenPodMedia, off.onSharePodMedia, off.onCopyPodMedia]).toEqual([
      undefined,
      undefined,
      undefined,
    ]);
  });

  it('opens the scanner on the pod that was chosen', async () => {
    const { api } = mount();
    expect(document.body.querySelector('[role="dialog"]')).toBeNull();

    await act(async () => api.current!.menuHandlers(pod()).onScan());

    expect(document.body.querySelector('[role="dialog"]')).not.toBeNull();
  });

  // A venue-rejected pod opens the FULL edit + resubmission flow; every other
  // pod keeps the limited title/description/media edit.
  it('opens the resubmit flow for a rejected pod and the plain edit for any other', async () => {
    const rejected = mount();
    await act(async () =>
      rejected.api.current!.menuHandlers(pod({ venue_approval_status: 'DECLINED' })).onEdit(),
    );
    expect(document.body.textContent).toContain(labels.resubmitTitle);

    cleanup();
    const plain = mount();
    await act(async () => plain.api.current!.menuHandlers(pod()).onEdit());
    expect(document.body.textContent).toContain(labels.editPod);
  });

  it('opens the cancel dialog on the pod it was asked about', async () => {
    const { api } = mount();

    await act(async () => api.current!.menuHandlers(pod()).onCancel());

    expect(document.body.textContent).toContain(labels.cancelPod);
  });

  it('opens the completion dialog on the pod it was asked about', async () => {
    const { api } = mount();

    await act(async () => api.current!.menuHandlers(pod()).onComplete());

    expect(document.body.textContent).toContain(labels.completePod);
  });

  // A dismissed share sheet rejects on iOS — that is the host closing it, not a
  // failure worth showing them.
  it('swallows a rejected share rather than surfacing it', async () => {
    const share = vi.fn().mockRejectedValue(new Error('AbortError'));
    Object.defineProperty(globalThis.navigator, 'share', { configurable: true, value: share });
    const notifyError = vi.fn();
    const { api } = mount(vi.fn(), { notifyError, onOpenPodMedia: vi.fn() });

    await act(async () => {
      api.current!.menuHandlers(pod()).onShareFeedback();
      api.current!.menuHandlers(pod()).onSharePodMedia?.();
    });
    await settle();

    expect(notifyError).not.toHaveBeenCalled();
    Reflect.deleteProperty(globalThis.navigator, 'share');
  });

  it('opens the rating form and the media page through the surface', () => {
    const onOpenFeedback = vi.fn();
    const onOpenPodMedia = vi.fn();
    const { api } = mount(vi.fn(), { onOpenFeedback, onOpenPodMedia });

    act(() => {
      api.current!.menuHandlers(pod()).onOpenFeedback();
      api.current!.menuHandlers(pod()).onOpenPodMedia?.();
    });

    expect(onOpenFeedback).toHaveBeenCalledWith('pod-1');
    expect(onOpenPodMedia).toHaveBeenCalledWith('pod-1');
  });

  it('copies both links without reporting a failure', async () => {
    Object.defineProperty(globalThis.navigator, 'clipboard', {
      configurable: true,
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
    const notifySuccess = vi.fn();
    const { api } = mount(vi.fn(), { notifySuccess, onOpenPodMedia: vi.fn() });

    await act(async () => {
      api.current!.menuHandlers(pod()).onCopyFeedback();
      api.current!.menuHandlers(pod()).onCopyPodMedia?.();
    });
    await settle();

    expect(notifySuccess).toHaveBeenCalledTimes(2);
  });
});
