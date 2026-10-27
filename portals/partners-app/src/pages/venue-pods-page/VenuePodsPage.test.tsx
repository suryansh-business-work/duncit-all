import '../../../__tests__/helpers/agGridEnv';
import '../../__tests__/groupC-wide-grid';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import VenuePodsPage from './VenuePodsPage';
import { cancelSuccessMessage } from './queries';
import { makeVenuePodRow } from './__tests__/fixtures';
import { renderWithProviders } from '../../__tests__/render';
import { scriptedLink, type ScriptedAnswer, type SentOperation } from '../../__tests__/groupC-link';

beforeEach(() => {
  globalThis.localStorage.clear();
});
afterEach(cleanup);

const venue = { __typename: 'Venue', id: 'v1', venue_name: 'Hall A' };

const cancelled = {
  venueCancelPod: {
    __typename: 'VenueCancelPodResult',
    pod_id: '1',
    health_penalty: 7,
    venue_health_score: 82,
    refunded_count: 3,
  },
};

const board = {
  myPodChangeBoard: { __typename: 'PodChangeBoard', mine: [], incoming: [], venue_penalty: 5, host_penalty: 5, club_admin_penalty: 5 },
};

const podRow = (over: Record<string, unknown> = {}) => ({ __typename: 'VenuePodRow', ...makeVenuePodRow(over as never) });

const mount = (answers: Record<string, ScriptedAnswer> = {}, sent: SentOperation[] = []) =>
  renderWithProviders(<VenuePodsPage />, {
    route: '/venues/pods',
    link: scriptedLink(
      {
        MyVenues: { myVenues: [venue] },
        VenuePods: { venuePods: [podRow({ pod_title: 'Sunrise Yoga' })] },
        VenueCancelPenalty: { publicAppSettings: { __typename: 'PublicAppSettings', venue_cancel_health_penalty: 7 } },
        VenueCancelPod: cancelled,
        MyPodChangeBoard: board,
        ...answers,
      },
      sent,
    ),
  });

const rowOf = async (title: string) => within((await screen.findByText(title)).closest('[role="row"]') as HTMLElement);
const reads = (sent: SentOperation[]) => sent.filter((op) => op.name === 'VenuePods');

describe('VenuePodsPage', () => {
  it('lists the selected venue’s upcoming pods', async () => {
    const sent: SentOperation[] = [];
    mount({}, sent);
    expect(await screen.findByText('Sunrise Yoga')).toBeTruthy();
    expect(reads(sent)[0].variables).toEqual({ venue_id: 'v1' });
  });

  it('shows the server message when the pods cannot be read', async () => {
    mount({ VenuePods: new Error('Pods are unavailable') });
    expect(await screen.findByText('Pods are unavailable')).toBeTruthy();
  });

  it('opens a change request for the venue, with the pod’s seats in its warning', async () => {
    mount();
    fireEvent.click((await rowOf('Sunrise Yoga')).getByRole('button', { name: 'Request Change Venue' }));
    const dialog = within(await screen.findByRole('dialog'));
    expect(dialog.getByText('Ask Duncit for a change?')).toBeTruthy();
    expect(dialog.getByText(/people have already booked seats on this pod/)).toBeTruthy();
  });

  it('cancels a pod with a reason, says what was refunded and re-reads the pods', async () => {
    const sent: SentOperation[] = [];
    mount({}, sent);
    fireEvent.click((await rowOf('Sunrise Yoga')).getByRole('button', { name: 'Cancel pod' }));
    const dialog = within(await screen.findByRole('dialog'));
    fireEvent.change(await dialog.findByLabelText(/Why are you cancelling/), { target: { value: 'Kitchen flooded overnight' } });
    const before = reads(sent).length;
    fireEvent.click(dialog.getByRole('button', { name: 'Cancel this pod' }));

    expect(await screen.findByText(cancelSuccessMessage(cancelled.venueCancelPod))).toBeTruthy();
    expect(sent.find((op) => op.name === 'VenueCancelPod')?.variables).toEqual({
      pod_id: '1',
      reason: 'Kitchen flooded overnight',
    });
    await waitFor(() => expect(reads(sent).length).toBeGreaterThan(before));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });
});
