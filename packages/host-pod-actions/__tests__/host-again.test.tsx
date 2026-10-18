/**
 * "Host again" on a host's own pod row.
 *
 * The row is only worth offering where the surface can open Create Pod, so it
 * must be absent without `onHostAgain`. When it is there, a tap hands the pod
 * id to the surface and asks the server for nothing: the draft is made only
 * once the host moves on in the form, so a tap and a back-out leave no draft.
 */
import type { ReactNode } from 'react';
import { MockedProvider } from '@apollo/client/testing/react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import HostPodActionsMenu from '../src/HostPodActionsMenu';
import { HostPodActionsProvider, type HostPodActionsConfig } from '../src/HostPodActionsProvider';
import { useHostPodActions } from '../src/useHostPodActions';
import type { HostPodTarget } from '../src/types';
import { hostActionsConfig, labelsFor } from './host-actions-config';

const labels = labelsFor();

const POD = {
  id: 'pod-1',
  pod_title: 'Sunday Badminton',
  pod_description: 'Doubles at Court 2, all levels welcome.',
  pod_images_and_videos: [{ url: 'https://cdn.duncit.com/pod/a.jpg', type: 'IMAGE' }],
  pod_date_time: '2020-01-01T10:00:00.000Z',
  pod_end_date_time: '2020-01-01T12:00:00.000Z',
  venue_id: 'venue-1',
  venue_approval_status: 'APPROVED',
} as HostPodTarget;

function Row() {
  const { menuHandlers, dialogs } = useHostPodActions(vi.fn());
  return (
    <>
      <HostPodActionsMenu {...menuHandlers(POD)} podId={POD.id} />
      {dialogs}
    </>
  );
}

const mount = (config: Partial<HostPodActionsConfig>) => {
  const all = hostActionsConfig(config);
  // No mocked answers: any request the row made would surface as an error.
  const ui: ReactNode = (
    <MockedProvider mocks={[]}>
      <HostPodActionsProvider {...all}>
        <Row />
      </HostPodActionsProvider>
    </MockedProvider>
  );
  render(ui);
  fireEvent.click(screen.getByTestId('host-pod-actions-pod-1'));
  return all;
};

const hostAgainRow = () => screen.queryByTestId('host-pod-action-host-again-pod-1');

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('Host again', () => {
  it('is not offered where the surface has no Create Pod route to open', () => {
    mount({});

    expect(hostAgainRow()).toBeNull();
  });

  it('is offered, with its hint, on a pod that has already ended', () => {
    mount({ onHostAgain: vi.fn() });

    const row = hostAgainRow();
    expect(row).not.toBeNull();
    expect(row?.textContent).toContain(labels.hostAgain);
    expect(row?.textContent).toContain(labels.hostAgainHint);
    expect(row?.getAttribute('aria-disabled')).not.toBe('true');
  });

  it('opens Create Pod for this pod without making a draft', () => {
    const onHostAgain = vi.fn();
    const config = mount({ onHostAgain });

    fireEvent.click(hostAgainRow()!);

    expect(onHostAgain).toHaveBeenCalledTimes(1);
    expect(onHostAgain).toHaveBeenCalledWith('pod-1');
    expect(config.notifyError).not.toHaveBeenCalled();
  });
});
