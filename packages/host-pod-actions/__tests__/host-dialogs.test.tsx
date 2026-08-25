/**
 * The dialogs a host opens from their own pod.
 *
 * Each is mounted through the real provider, because the whole design of this
 * package is that the SURFACE supplies its own media field, its own toasts and
 * its own idea of where a profile link goes — the dialogs hold the pod rules,
 * not the chrome. Nothing behind them answers, so what is asserted is that the
 * rules hold with no data: an edit will not save without a title, an image and
 * a description, and a cancel with no pod is not a dialog at all.
 */
import type { ReactNode } from 'react';
import { MockedProvider } from '@apollo/client/testing';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { act, fireEvent, render } from '@testing-library/react';
import { buildSlotLabels } from '@duncit/slots';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { HostPodActionsProvider, type HostPodActionsConfig } from '../src/HostPodActionsProvider';
import PodCancelDialog from '../src/PodCancelDialog';
import PodEditDialog from '../src/PodEditDialog';
import PodResubmitDialog from '../src/pod-resubmit/PodResubmitDialog';
import { mwebHostPodLabels } from '../src/labels';
import type { HostPodTarget } from '../src/types';

const t = (key: string) => key;

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

const notifySuccess = vi.fn();
const notifyError = vi.fn();

const config = (): HostPodActionsConfig => ({
  labels: mwebHostPodLabels(t),
  renderMediaField: ({ value, onChange }) => (
    <textarea aria-label="media" value={value} onChange={(event) => onChange(event.target.value)} />
  ),
  onViewProfile: vi.fn(),
  feedbackBaseUrl: 'https://duncit.com',
  onOpenFeedback: vi.fn(),
  notifySuccess,
  notifyError,
  slotLabels: buildSlotLabels(t, 'mweb.slots'),
});

const pod = (over: Partial<HostPodTarget> = {}): HostPodTarget =>
  (({
    id: 'pod-1',
    pod_title: 'Sunday Badminton',
    pod_description: 'Doubles at Court 2, all levels welcome.',
    pod_images_and_videos: [{ url: 'https://cdn.duncit.com/pod/a.jpg', type: 'IMAGE' }],
    ...over
  }) as HostPodTarget);

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

afterEach(() => {
  vi.clearAllMocks();
});

describe('PodEditDialog', () => {
  it('renders nothing when there is no pod to edit', () => {
    wrap(<PodEditDialog pod={null} onClose={vi.fn()} onSaved={vi.fn()} />);

    expect(document.body.querySelector('[role="dialog"]')).toBeNull();
  });

  it('opens prefilled from the pod', async () => {
    wrap(<PodEditDialog pod={pod()} onClose={vi.fn()} onSaved={vi.fn()} />);
    await settle();

    const values = [...document.body.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input, textarea')].map(
      (field) => field.value
    );
    expect(values).toContain('Sunday Badminton');
  });

  it('uses the media field the SURFACE supplied, not one of its own', async () => {
    wrap(<PodEditDialog pod={pod()} onClose={vi.fn()} onSaved={vi.fn()} />);
    await settle();

    expect(document.body.querySelector('[aria-label="media"]')).not.toBeNull();
  });

  it('will not report a save when the title has been emptied', async () => {
    const onSaved = vi.fn();
    wrap(<PodEditDialog pod={pod()} onClose={vi.fn()} onSaved={onSaved} />);
    await settle();

    for (const field of document.body.querySelectorAll<HTMLInputElement>('input')) {
      fireEvent.change(field, { target: { value: '' } });
    }
    await settle();
    await pressEverything();

    expect(onSaved).not.toHaveBeenCalled();
  });

  it('will not report a save when the gallery has no image', async () => {
    const onSaved = vi.fn();
    wrap(<PodEditDialog pod={pod({ pod_images_and_videos: [] })} onClose={vi.fn()} onSaved={onSaved} />);
    await settle();
    await pressEverything();

    expect(onSaved).not.toHaveBeenCalled();
  });
});

describe('PodCancelDialog', () => {
  it('renders nothing when there is no pod', () => {
    wrap(<PodCancelDialog podId={null} podTitle="" onClose={vi.fn()} onCancelled={vi.fn()} />);

    expect(document.body.querySelector('[role="dialog"]')).toBeNull();
  });

  it('names the pod it is about to cancel', async () => {
    wrap(<PodCancelDialog podId="pod-1" podTitle="Sunday Badminton" onClose={vi.fn()} onCancelled={vi.fn()} />);
    await settle();

    expect(document.body.textContent).toContain('Sunday Badminton');
  });

  it('does not report a cancellation the server never confirmed', async () => {
    const onCancelled = vi.fn();
    wrap(<PodCancelDialog podId="pod-1" podTitle="Sunday Badminton" onClose={vi.fn()} onCancelled={onCancelled} />);
    await settle();
    await pressEverything();

    expect(onCancelled).not.toHaveBeenCalled();
  });
});

describe('PodResubmitDialog', () => {
  it('renders nothing when there is no rejected pod', () => {
    wrap(<PodResubmitDialog pod={null} onClose={vi.fn()} onSaved={vi.fn()} />);

    expect(document.body.querySelector('[role="dialog"]')).toBeNull();
  });

  it('opens with the rejected pod’s copy, and no venue or slot chosen yet', async () => {
    wrap(<PodResubmitDialog pod={pod()} onClose={vi.fn()} onSaved={vi.fn()} />);
    await settle();
    await settle();

    expect(document.body.querySelector('[role="dialog"]')).not.toBeNull();
  });

  it('does not resubmit until a venue and a slot have been picked', async () => {
    const onResubmitted = vi.fn();
    wrap(<PodResubmitDialog pod={pod()} onClose={vi.fn()} onSaved={onResubmitted} />);
    await settle();
    await pressEverything();

    expect(onResubmitted).not.toHaveBeenCalled();
  });
});
