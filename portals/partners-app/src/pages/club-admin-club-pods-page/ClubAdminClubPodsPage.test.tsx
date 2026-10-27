import '../../../__tests__/helpers/agGridEnv';
import '../../__tests__/groupC-wide-grid';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import ClubAdminClubPodsPage from './ClubAdminClubPodsPage';
import { renderWithProviders } from '../../__tests__/render';
import { scriptedLink, type ScriptedAnswer, type SentOperation } from '../../__tests__/groupC-link';
import { clubAdminLookups, clubAdminPodRow, podTablePage } from '../../__tests__/groupC-fixtures';

beforeEach(() => {
  globalThis.localStorage.clear();
});
afterEach(cleanup);

const board = {
  myPodChangeBoard: {
    __typename: 'PodChangeBoard',
    mine: [],
    incoming: [],
    venue_penalty: 5,
    host_penalty: 5,
    club_admin_penalty: 5,
  },
};

const mount = (answers: Record<string, ScriptedAnswer> = {}, sent: SentOperation[] = [], rows = [clubAdminPodRow()]) =>
  renderWithProviders(<ClubAdminClubPodsPage />, {
    route: '/club-admin/clubs/club-1/pods',
    path: '/club-admin/clubs/:clubId/pods',
    link: scriptedLink(
      {
        ClubAdminPodLookups: clubAdminLookups(),
        ClubAdminPodsTable: podTablePage('clubAdminPodsTable', rows),
        MyPodChangeBoard: board,
        ...answers,
      },
      sent,
    ),
  });

const tableReads = (sent: SentOperation[]) => sent.filter((op) => op.name === 'ClubAdminPodsTable');
const rowOf = async (title: string) => within((await screen.findByText(title)).closest('[role="row"]') as HTMLElement);

describe('ClubAdminClubPodsPage', () => {
  it('lists the club pods, pinned to the club in the route, under the club name', async () => {
    const sent: SentOperation[] = [];
    mount({}, sent);
    expect(await screen.findByText('Sunrise Tennis Doubles')).toBeTruthy();
    expect(tableReads(sent)[0].variables).toMatchObject({ club_id: 'club-1', status: null });
    expect(await screen.findByText(/Sunrise Tennis Club/)).toBeTruthy();
  });

  it('shows the lookup failure', async () => {
    mount({ ClubAdminPodLookups: new Error('Lookups are unavailable') });
    expect(await screen.findByText('Lookups are unavailable')).toBeTruthy();
  });

  it('asks the server for one status bucket and reloads the table when the filter changes', async () => {
    const sent: SentOperation[] = [];
    mount({}, sent);
    await screen.findByText('Sunrise Tennis Doubles');
    const before = tableReads(sent).length;
    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Status' }));
    const options = await screen.findAllByRole('option');
    fireEvent.click(options[1]);
    await waitFor(() => expect(tableReads(sent).length).toBeGreaterThan(before));
    expect(tableReads(sent).at(-1)?.variables.status).toBeTruthy();
  });

  it('opens the pod, its attendance and its editor from the row, under the club', async () => {
    mount();
    const row = await rowOf('Sunrise Tennis Doubles');
    const hrefs = row.getAllByRole('link').map((link) => link.getAttribute('href'));
    expect(hrefs).toContain('/club-admin/clubs/club-1/pods/pod-1');
    expect(hrefs).toContain('/club-admin/clubs/club-1/pods/pod-1/edit');
  });

  it('deletes a pod after confirming, says so and reloads the table', async () => {
    const sent: SentOperation[] = [];
    mount({ ClubAdminDeletePod: { clubAdminDeletePod: true } }, sent);
    const row = await rowOf('Sunrise Tennis Doubles');
    const before = tableReads(sent).length;
    fireEvent.click(row.getByRole('button', { name: 'Delete pod' }));
    const dialog = within(await screen.findByRole('dialog'));
    expect(dialog.getByText(/Sunrise Tennis Doubles/)).toBeTruthy();
    fireEvent.click(dialog.getByRole('button', { name: 'Delete' }));

    expect(await screen.findByText('Pod deleted.')).toBeTruthy();
    expect(sent.find((op) => op.name === 'ClubAdminDeletePod')?.variables).toEqual({ pod_doc_id: 'pod-1' });
    await waitFor(() => expect(tableReads(sent).length).toBeGreaterThan(before));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('keeps the pod and says why when the delete is refused', async () => {
    const sent: SentOperation[] = [];
    mount({ ClubAdminDeletePod: new Error('Pod has bookings') }, sent);
    const row = await rowOf('Sunrise Tennis Doubles');
    fireEvent.click(row.getByRole('button', { name: 'Delete pod' }));
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Delete' }));
    expect(await screen.findByText('Pod has bookings')).toBeTruthy();
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(screen.queryByText('Pod deleted.')).toBeNull();
  });

  it('forgets the delete when the dialog is cancelled', async () => {
    const sent: SentOperation[] = [];
    mount({}, sent);
    const row = await rowOf('Sunrise Tennis Doubles');
    fireEvent.click(row.getByRole('button', { name: 'Delete pod' }));
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(sent.some((op) => op.name === 'ClubAdminDeletePod')).toBe(false);
  });

  it('clears an earlier delete error when another delete is started', async () => {
    mount({ ClubAdminDeletePod: new Error('Pod has bookings') });
    const row = await rowOf('Sunrise Tennis Doubles');
    fireEvent.click(row.getByRole('button', { name: 'Delete pod' }));
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Delete' }));
    await screen.findByText('Pod has bookings');
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    fireEvent.click((await rowOf('Sunrise Tennis Doubles')).getByRole('button', { name: 'Delete pod' }));
    await waitFor(() => expect(screen.queryByText('Pod has bookings')).toBeNull());
  });

  it('ignores a second click on Delete that lands while the dialog is already closing', async () => {
    const sent: SentOperation[] = [];
    mount({ ClubAdminDeletePod: { clubAdminDeletePod: true } }, sent);
    fireEvent.click((await rowOf('Sunrise Tennis Doubles')).getByRole('button', { name: 'Delete pod' }));
    const confirm = within(await screen.findByRole('dialog')).getByRole('button', { name: 'Delete' });
    fireEvent.click(confirm);
    await screen.findByText('Pod deleted.');
    // The dialog fades out for a moment after the pod is forgotten; the button is still there.
    fireEvent.click(confirm);
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(sent.filter((op) => op.name === 'ClubAdminDeletePod')).toHaveLength(1);
  });

  it('opens the change request for the pod’s club admin and warns about its booked seats', async () => {
    mount();
    const row = await rowOf('Sunrise Tennis Doubles');
    fireEvent.click(row.getByRole('button', { name: 'Request Change Club Admin' }));
    const dialog = within(await screen.findByRole('dialog'));
    expect(dialog.getByText('Ask Duncit for a change?')).toBeTruthy();
    expect(dialog.getByText(/people have already booked seats on this pod/)).toBeTruthy();
  });

  it('opens the change request without a seat warning for a pod nobody has booked', async () => {
    mount({}, [], [clubAdminPodRow({ pod_attendees: null })]);
    const row = await rowOf('Sunrise Tennis Doubles');
    fireEvent.click(row.getByRole('button', { name: 'Request Change Club Admin' }));
    const dialog = within(await screen.findByRole('dialog'));
    expect(dialog.getByText('Ask Duncit for a change?')).toBeTruthy();
    expect(dialog.queryByText(/already booked/)).toBeNull();
  });

  it('keeps change and delete off a pod that is already cancelled, but leaves it editable', async () => {
    mount({}, [], [clubAdminPodRow({ is_deleted: true })]);
    const row = await rowOf('Sunrise Tennis Doubles');
    expect(row.queryByRole('button', { name: 'Delete pod' })).toBeNull();
    expect(row.queryByRole('button', { name: 'Request Change Club Admin' })).toBeNull();
    expect(row.getAllByRole('link').some((link) => link.getAttribute('href')?.endsWith('/pod-1/edit'))).toBe(true);
  });
});
