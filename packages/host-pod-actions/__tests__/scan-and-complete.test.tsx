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
import { MockedProvider } from '@apollo/client/testing';
import { act, fireEvent, render } from '@testing-library/react';
import { buildSlotLabels } from '@duncit/slots';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { HostPodActionsProvider, type HostPodActionsConfig } from '../src/HostPodActionsProvider';
import PodCompleteDialog from '../src/pod-complete/PodCompleteDialog';
import TicketScanDialog from '../src/ticket-scan/TicketScanDialog';
import { mwebHostPodLabels } from '../src/labels';

const t = (key: string) => key;

const settle = async () => {
  await act(async () => {
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
  });
};

const config = (): HostPodActionsConfig => ({
  labels: mwebHostPodLabels(t),
  renderMediaField: ({ value, onChange }) => (
    <textarea aria-label="media" value={value} onChange={(event) => onChange(event.target.value)} />
  ),
  onViewProfile: vi.fn(),
  feedbackBaseUrl: 'https://duncit.com',
  onOpenFeedback: vi.fn(),
  notifySuccess: vi.fn(),
  notifyError: vi.fn(),
  slotLabels: buildSlotLabels(t, 'mweb.slots'),
});

const wrap = (ui: ReactNode) =>
  render(
    <MockedProvider mocks={[]}>
      <HostPodActionsProvider {...config()}>{ui}</HostPodActionsProvider>
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

    expect(document.body.textContent).toContain('Sunday Badminton');
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
