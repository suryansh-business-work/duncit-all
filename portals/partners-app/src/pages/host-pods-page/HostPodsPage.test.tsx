import '../../../__tests__/helpers/agGridEnv';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { PodFormProps } from '@duncit/pod-form';
import HostPodsPage from './HostPodsPage';
import { renderWithProviders } from '../../__tests__/render';
import { scriptedLink, type ScriptedAnswer, type SentOperation } from '../../__tests__/groupC-link';
import { partnerLookups, partnerPodRow, podTablePage } from '../../__tests__/groupC-fixtures';

/** The pod form has its own suite; this page decides what happens with what it hands back. */
function PodFormStub({ initialValues, error, onSubmit, onCancel, ownVenueIds }: Readonly<PodFormProps>) {
  return (
    <div data-testid="pod-form" data-own-venues={(ownVenueIds ?? []).join(',')}>
      {error && <p>{error}</p>}
      <button type="button" onClick={() => onSubmit(initialValues, { draft: false })}>
        Publish pod
      </button>
      <button type="button" onClick={() => onSubmit(initialValues, { draft: true })}>
        Save draft
      </button>
      <button type="button" onClick={onCancel}>
        Discard pod
      </button>
    </div>
  );
}

vi.mock(import('@duncit/pod-form'), async (importOriginal) => ({
  ...(await importOriginal()),
  PodForm: PodFormStub,
}));

beforeEach(() => {
  globalThis.localStorage.clear();
});
afterEach(cleanup);

const mount = (answers: Record<string, ScriptedAnswer> = {}, route = '/host/pods', sent: SentOperation[] = []) =>
  renderWithProviders(<HostPodsPage />, {
    route,
    link: scriptedLink(
      {
        PartnerPodLookups: partnerLookups('APPROVED'),
        PartnerMyHostPodsTable: podTablePage('myHostPodsTable', [partnerPodRow()]),
        ...answers,
      },
      sent,
    ),
  });

const created = { createPartnerPod: { __typename: 'Pod', id: 'pod-new' } };

const newPodButton = async () => {
  const button = await screen.findByRole('button', { name: 'New Pod' });
  await waitFor(() => expect(button.hasAttribute('disabled')).toBe(false));
  return button;
};

describe('HostPodsPage', () => {
  it('lists the host’s pods with the club and venue names', async () => {
    mount();
    const row = (await screen.findByText('Sunrise Tennis Doubles')).closest('[role="row"]') as HTMLElement;
    expect(within(row).getByText('Sunrise Tennis Club')).toBeTruthy();
  });

  it('keeps New Pod off and explains why until the host application is approved', async () => {
    mount({ PartnerPodLookups: partnerLookups('SUBMITTED') });
    expect(await screen.findByText('Your host application must be approved before you can create pods.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'New Pod' }).hasAttribute('disabled')).toBe(true);
  });

  it('shows the lookup failure', async () => {
    mount({ PartnerPodLookups: new Error('Lookups are unavailable') });
    expect(await screen.findByText('Lookups are unavailable')).toBeTruthy();
  });

  it('creates a live pod, confirms it and reloads the table', async () => {
    const sent: SentOperation[] = [];
    mount({ CreatePartnerPod: created }, '/host/pods', sent);
    fireEvent.click(await newPodButton());
    const dialog = within(await screen.findByRole('dialog'));
    // Every bookable venue here is the host's own, so its slots book instantly.
    expect(dialog.getByTestId('pod-form').dataset.ownVenues).toBe('venue-1');
    const loads = sent.filter((op) => op.name === 'PartnerMyHostPodsTable').length;
    fireEvent.click(dialog.getByRole('button', { name: 'Publish pod' }));

    expect(await screen.findByText('Pod created.')).toBeTruthy();
    const input = sent.find((op) => op.name === 'CreatePartnerPod')?.variables.input as Record<string, unknown>;
    expect(input.is_active).toBe(true);
    expect(input.pod_type).toBe('FREE');
    expect(input.pod_amount).toBe(0);
    await waitFor(() => expect(sent.filter((op) => op.name === 'PartnerMyHostPodsTable').length).toBeGreaterThan(loads));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('saves a draft as an inactive pod', async () => {
    const sent: SentOperation[] = [];
    mount({ CreatePartnerPod: created }, '/host/pods', sent);
    fireEvent.click(await newPodButton());
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Save draft' }));
    expect(await screen.findByText('Pod draft saved.')).toBeTruthy();
    const input = sent.find((op) => op.name === 'CreatePartnerPod')?.variables.input as Record<string, unknown>;
    expect(input.is_active).toBe(false);
  });

  it('keeps the dialog open with the server’s reason when the pod is refused', async () => {
    mount({ CreatePartnerPod: new Error('Pick a venue slot first') });
    fireEvent.click(await newPodButton());
    const dialog = within(await screen.findByRole('dialog'));
    fireEvent.click(dialog.getByRole('button', { name: 'Publish pod' }));
    expect(await dialog.findByText('Pick a venue slot first')).toBeTruthy();
    expect(screen.queryByText('Pod created.')).toBeNull();
  });

  it('opens the dialog from the dashboard’s ?new=1 link, once, for an approved host', async () => {
    mount({}, '/host/pods?new=1');
    expect(await screen.findByRole('dialog')).toBeTruthy();
    await waitFor(() => expect(screen.getByTestId('location').textContent).toBe('/host/pods'));
  });

  it('does not open the dialog from ?new=1 while the host is not approved', async () => {
    mount({ PartnerPodLookups: partnerLookups('SUBMITTED') }, '/host/pods?new=1');
    await screen.findByText('Your host application must be approved before you can create pods.');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('asks Duncit for a different host from the pod’s menu, warning about the seats already sold', async () => {
    mount({
      PartnerMyHostPodsTable: podTablePage('myHostPodsTable', [partnerPodRow({ pod_date_time: '2027-10-04T07:30:00.000Z' })]),
      MyPodChangeBoard: {
        myPodChangeBoard: { __typename: 'PodChangeBoard', mine: [], incoming: [], venue_penalty: 5, host_penalty: 5, club_admin_penalty: 5 },
      },
    });
    await screen.findByText('Sunrise Tennis Doubles');
    fireEvent.click(screen.getByTestId('host-pod-actions-pod-1'));
    fireEvent.click(await screen.findByTestId('host-pod-action-request-change-pod-1'));
    const dialog = within(await screen.findByRole('dialog'));
    expect(dialog.getByText('Ask Duncit for a change?')).toBeTruthy();
    expect(dialog.getByText(/people have already booked seats on this pod/)).toBeTruthy();
  });

  it('opens that request without a seat warning for a pod nobody has booked', async () => {
    mount({
      PartnerMyHostPodsTable: podTablePage('myHostPodsTable', [partnerPodRow({ pod_attendees: null, pod_date_time: '2027-10-04T07:30:00.000Z' })]),
      MyPodChangeBoard: {
        myPodChangeBoard: { __typename: 'PodChangeBoard', mine: [], incoming: [], venue_penalty: 5, host_penalty: 5, club_admin_penalty: 5 },
      },
    });
    await screen.findByText('Sunrise Tennis Doubles');
    fireEvent.click(screen.getByTestId('host-pod-actions-pod-1'));
    fireEvent.click(await screen.findByTestId('host-pod-action-request-change-pod-1'));
    const dialog = within(await screen.findByRole('dialog'));
    expect(dialog.getByText('Ask Duncit for a change?')).toBeTruthy();
    expect(dialog.queryByText(/already booked/)).toBeNull();
  });

  it('falls back to a generic club and venue name for a pod whose club and venue the host no longer sees', async () => {
    mount({
      PartnerMyHostPodsTable: podTablePage('myHostPodsTable', [partnerPodRow({ club_id: 'club-gone', venue_id: 'venue-gone' })]),
    });
    const row = (await screen.findByText('Sunrise Tennis Doubles')).closest('[role="row"]') as HTMLElement;
    expect(within(row).getByText('Club')).toBeTruthy();
    expect(within(row).getByText('Venue')).toBeTruthy();
  });

  it('closes the dialog from the form’s cancel', async () => {
    mount();
    fireEvent.click(await newPodButton());
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Discard pod' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });
});
