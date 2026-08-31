/**
 * The two dialogs that end a pod: the door scanner and the completion.
 *
 * Both are mounted through the real provider — the surface supplies its own
 * media field, toasts and profile navigation — with nothing answering behind
 * them. Completion is the one that matters most: it computes the payout from
 * exactly who is marked and hands the releases to Finance, so it must not
 * report a completion the server never confirmed.
 */
import type { ReactNode } from 'react';
import { MockedProvider } from '@apollo/client/testing/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { HostPodActionsProvider } from '../src/HostPodActionsProvider';
import { hostActionsConfig } from './host-actions-config';
import PodCompleteDialog from '../src/pod-complete/PodCompleteDialog';
import TicketScanDialog from '../src/ticket-scan/TicketScanDialog';
import { labelsFor } from './host-actions-config';
/**
 * A theme, because MUI's `useTheme()` returns NULL outside a provider rather
 * than falling back to the default one — so a component reading it through a
 * callback (`useMediaQuery((theme) => theme.breakpoints.down('sm'))`) throws
 * mid-render. In the app the theme comes from the surface; here it does not.
 */
const testTheme = createTheme();

const settle = async () => {
  await act(async () => {
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
  });
};

const config = () => hostActionsConfig();

const wrap = (ui: ReactNode) =>
  render(
    <MockedProvider mocks={[]}>
      <ThemeProvider theme={testTheme}>
      <HostPodActionsProvider {...config()}>{ui}</HostPodActionsProvider>
      </ThemeProvider>
    </MockedProvider>
  );

const pressEverything = async () => {
  for (const control of [...document.body.querySelectorAll<HTMLElement>('button:not([disabled])')].slice(0, 15)) {
    if (!control.isConnected) continue;
    fireEvent.click(control);
    await settle();
  }
};

const POD = { id: 'pod-1', pod_title: 'Sunday Badminton' };
const labels = labelsFor();

afterEach(() => {
  vi.clearAllMocks();
});

describe('TicketScanDialog', () => {
  it('renders nothing when there is no pod to scan for', () => {
    wrap(<TicketScanDialog pod={null} onClose={vi.fn()} />);

    expect(document.body.querySelector('[role="dialog"]')).toBeNull();
  });

  it('opens on the pod it is scanning for', async () => {
    wrap(<TicketScanDialog pod={POD} onClose={vi.fn()} />);
    await settle();

    expect(document.body.querySelector('[role="dialog"]')).not.toBeNull();
    expect(document.body.textContent).toContain('Sunday Badminton');
  });

  it('survives a jsdom with no camera, which is every CI runner', async () => {
    wrap(<TicketScanDialog pod={POD} onClose={vi.fn()} />);
    await settle();
    await settle();

    expect(document.body.querySelector('[role="dialog"]')).not.toBeNull();
  });

  it('survives every control on it being pressed', async () => {
    wrap(<TicketScanDialog pod={POD} onClose={vi.fn()} />);
    await settle();
    await pressEverything();

    expect(document.body.innerHTML).not.toBe('');
  });

  it('closes through the caller rather than on its own', async () => {
    const onClose = vi.fn();
    wrap(<TicketScanDialog pod={POD} onClose={onClose} />);
    await settle();

    fireEvent.keyDown(document.body.querySelector('[role="dialog"]') as Element, { key: 'Escape', code: 'Escape' });
    await settle();

    expect(onClose).toHaveBeenCalled();
  });
});

describe('PodCompleteDialog', () => {
  it('renders nothing when there is no pod to complete', () => {
    wrap(<PodCompleteDialog pod={null} onClose={vi.fn()} onCompleted={vi.fn()} />);

    expect(document.body.querySelector('[role="dialog"]')).toBeNull();
  });

  it('opens on the pod, before the settlement preview has answered', async () => {
    wrap(<PodCompleteDialog pod={POD} onClose={vi.fn()} onCompleted={vi.fn()} />);
    await settle();

    expect(document.body.querySelector('[role="dialog"]')).not.toBeNull();
    expect(document.body.textContent).toContain(labels.completePod);
    expect(document.body.textContent).toContain(labels.completeHint);
  });

  // Only a pod booked into a venue owes the venue anything, so only that one
  // is asked for a bill — an unbooked pod's dialog has no such box to fill.
  it('asks for the venue bill only when the pod was booked into a venue', async () => {
    wrap(
      <PodCompleteDialog pod={{ ...POD, venue_id: 'venue-1' }} onClose={vi.fn()} onCompleted={vi.fn()} />,
    );
    await settle();
    expect(document.body.textContent).toContain(labels.venueBillAmount);

    cleanup();
    wrap(<PodCompleteDialog pod={POD} onClose={vi.fn()} onCompleted={vi.fn()} />);
    await settle();

    expect(document.body.textContent).not.toContain(labels.venueBillAmount);
  });

  it('survives the settlement preview failing rather than blanking the dialog', async () => {
    wrap(<PodCompleteDialog pod={POD} onClose={vi.fn()} onCompleted={vi.fn()} />);
    await settle();
    await settle();

    expect(document.body.querySelector('[role="dialog"]')).not.toBeNull();
  });

  it('opens for a pod with no venue, whose waterfall has no venue lines', async () => {
    wrap(
      <PodCompleteDialog pod={{ ...POD, venue_id: null }} onClose={vi.fn()} onCompleted={vi.fn()} />
    );
    await settle();

    expect(document.body.querySelector('[role="dialog"]')).not.toBeNull();
  });

  it('never reports a completion the server did not confirm', async () => {
    const onCompleted = vi.fn();
    wrap(<PodCompleteDialog pod={POD} onClose={vi.fn()} onCompleted={onCompleted} />);
    await settle();
    await pressEverything();

    expect(onCompleted).not.toHaveBeenCalled();
  });
});
