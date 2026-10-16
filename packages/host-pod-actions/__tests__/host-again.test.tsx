/**
 * "Host again" on a host's own pod row.
 *
 * The row is only worth offering where the surface can open the draft it
 * makes, so it must be absent without `onHostAgainDraft`. When it is there, a
 * tap asks the server for a draft copy and hands the draft id to the surface;
 * a failed copy must tell the host rather than do nothing, and a double tap
 * must not leave two identical drafts behind.
 */
import type { ReactNode } from 'react';
import type { MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import HostPodActionsMenu from '../src/HostPodActionsMenu';
import { HostPodActionsProvider, type HostPodActionsConfig } from '../src/HostPodActionsProvider';
import { HOST_AGAIN_POD } from '../src/queries';
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

const settle = async () => {
  await act(async () => {
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
  });
};

const draftMock = (id: string): MockedResponse => ({
  request: { query: HOST_AGAIN_POD, variables: { pod_doc_id: 'pod-1' } },
  result: { data: { hostAgainPod: { __typename: 'PodDraft', id } } },
});

function Row() {
  const { menuHandlers, dialogs } = useHostPodActions(vi.fn());
  return (
    <>
      <HostPodActionsMenu {...menuHandlers(POD)} podId={POD.id} />
      {dialogs}
    </>
  );
}

const mount = (config: Partial<HostPodActionsConfig>, mocks: MockedResponse[] = []) => {
  const all = hostActionsConfig(config);
  const ui: ReactNode = (
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={mocks}>
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
  it('is not offered where the surface has no draft route to open', () => {
    mount({});

    expect(hostAgainRow()).toBeNull();
  });

  it('is offered, with its hint, on a pod that has already ended', () => {
    mount({ onHostAgainDraft: vi.fn() });

    const row = hostAgainRow();
    expect(row).not.toBeNull();
    expect(row?.textContent).toContain(labels.hostAgain);
    expect(row?.textContent).toContain(labels.hostAgainHint);
    expect(row?.getAttribute('aria-disabled')).not.toBe('true');
  });

  it('opens the draft the server made for this pod', async () => {
    const onHostAgainDraft = vi.fn();
    const config = mount({ onHostAgainDraft }, [draftMock('draft-9')]);

    fireEvent.click(hostAgainRow()!);
    await settle();

    expect(onHostAgainDraft).toHaveBeenCalledWith('draft-9');
    expect(config.notifyError).not.toHaveBeenCalled();
  });

  it('tells the host when the copy fails, and opens nothing', async () => {
    const onHostAgainDraft = vi.fn();
    const config = mount({ onHostAgainDraft }, [
      {
        request: { query: HOST_AGAIN_POD, variables: { pod_doc_id: 'pod-1' } },
        error: new Error('Only the pod host can host this pod again'),
      },
    ]);

    fireEvent.click(hostAgainRow()!);
    await settle();

    expect(config.notifyError).toHaveBeenCalledWith(labels.hostAgainFailed);
    expect(onHostAgainDraft).not.toHaveBeenCalled();
  });

  it('treats an answer without a draft id as a failed copy', async () => {
    const onHostAgainDraft = vi.fn();
    const config = mount({ onHostAgainDraft }, [draftMock('')]);

    fireEvent.click(hostAgainRow()!);
    await settle();

    expect(config.notifyError).toHaveBeenCalledWith(labels.hostAgainFailed);
    expect(onHostAgainDraft).not.toHaveBeenCalled();
  });

  it('makes one draft for a double tap', async () => {
    const onHostAgainDraft = vi.fn();
    // One mocked answer: a second request would find none and report an error.
    const config = mount({ onHostAgainDraft }, [draftMock('draft-9')]);

    fireEvent.click(hostAgainRow()!);
    fireEvent.click(screen.getByTestId('host-pod-actions-pod-1'));
    fireEvent.click(hostAgainRow()!);
    await settle();

    expect(onHostAgainDraft).toHaveBeenCalledTimes(1);
    expect(config.notifyError).not.toHaveBeenCalled();
  });
});
