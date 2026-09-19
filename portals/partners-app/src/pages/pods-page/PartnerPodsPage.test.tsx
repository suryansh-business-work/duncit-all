import '../../../__tests__/helpers/agGridEnv';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { PodFormProps } from '@duncit/pod-form';
import PartnerPodsPage from './PartnerPodsPage';
import { renderWithProviders } from '../../__tests__/render';
import { scriptedLink, type ScriptedAnswer, type SentOperation } from '../../__tests__/groupC-link';
import { partnerLookups, partnerPodRow, podTablePage } from '../../__tests__/groupC-fixtures';

/**
 * The pod form has its own suite in @duncit/pod-form; this page only decides
 * what happens with what the form hands back, so the form is a thin stand-in
 * that submits its initial values.
 */
function PodFormStub({ initialValues, error, onSubmit, onCancel }: Readonly<PodFormProps>) {
  return (
    <div data-testid="pod-form">
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

afterEach(cleanup);
beforeEach(() => {
  globalThis.localStorage.clear();
});

const rows = [
  partnerPodRow(),
  partnerPodRow({ id: 'pod-2', pod_title: 'Closed Court Rally', club_id: 'club-gone', venue_id: 'venue-2' }),
];

const mount = (answers: Record<string, ScriptedAnswer>, sent: SentOperation[] = []) =>
  renderWithProviders(<PartnerPodsPage />, {
    link: scriptedLink(
      {
        PartnerPodLookups: partnerLookups('APPROVED'),
        PartnerMyHostPodsTable: podTablePage('myHostPodsTable', rows),
        ...answers,
      },
      sent,
    ),
  });

const created = { createPartnerPod: { __typename: 'Pod', id: 'pod-new' } };

const openNewPod = async () => {
  const add = await screen.findByRole('button', { name: 'Add Pod' });
  await waitFor(() => expect(add.hasAttribute('disabled')).toBe(false));
  fireEvent.click(add);
  return screen.findByRole('dialog');
};

describe('PartnerPodsPage', () => {
  it('names each pod’s club and bookable venue, and a placeholder for the rest', async () => {
    mount({});

    const known = (await screen.findByText('Sunrise Tennis Doubles')).closest('[role="row"]') as HTMLElement;
    expect(within(known).getByText('Sunrise Tennis Club')).toBeTruthy();
    expect(within(known).getByText('Koramangala Courts')).toBeTruthy();

    // An unknown club and a switched-off venue are never named.
    const other = screen.getByText('Closed Court Rally').closest('[role="row"]') as HTMLElement;
    expect(within(other).getByText('Club')).toBeTruthy();
    expect(within(other).getByText('Venue')).toBeTruthy();
    expect(screen.queryByText('Closed Courts')).toBeNull();
  });

  it('keeps Add Pod off and explains why until the host application is approved', async () => {
    mount({ PartnerPodLookups: partnerLookups('SUBMITTED') });

    expect(
      await screen.findByText('Your host application must be approved before you can create pods.'),
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Add Pod' }).hasAttribute('disabled')).toBe(true);
  });

  it('shows the lookup failure', async () => {
    mount({ PartnerPodLookups: new Error('Lookups are unavailable') });
    expect(await screen.findByText('Lookups are unavailable')).toBeTruthy();
  });

  it('creates a live pod, confirms it and reloads the table', async () => {
    const sent: SentOperation[] = [];
    mount({ CreatePartnerPod: created }, sent);

    const dialog = await openNewPod();
    expect(within(dialog).getByText('New Pod')).toBeTruthy();
    expect(within(dialog).getByText('Your approved host profile is added as the pod host automatically.')).toBeTruthy();
    const tableLoads = sent.filter((op) => op.name === 'PartnerMyHostPodsTable').length;

    fireEvent.click(within(dialog).getByRole('button', { name: 'Publish pod' }));

    expect(await screen.findByText('Pod created.')).toBeTruthy();
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    const input = sent.find((op) => op.name === 'CreatePartnerPod')?.variables.input as Record<string, unknown>;
    expect(input.is_active).toBe(true);
    await waitFor(() =>
      expect(sent.filter((op) => op.name === 'PartnerMyHostPodsTable').length).toBeGreaterThan(tableLoads),
    );

    // The confirmation goes away when dismissed.
    fireEvent.keyDown(document.body, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByText('Pod created.')).toBeNull());
  });

  it('saves a draft as an inactive pod', async () => {
    const sent: SentOperation[] = [];
    mount({ CreatePartnerPod: created }, sent);

    const dialog = await openNewPod();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save draft' }));

    expect(await screen.findByText('Pod draft saved.')).toBeTruthy();
    const input = sent.find((op) => op.name === 'CreatePartnerPod')?.variables.input as Record<string, unknown>;
    expect(input.is_active).toBe(false);
  });

  it('keeps the dialog open with the server’s reason when the pod is refused', async () => {
    mount({ CreatePartnerPod: new Error('Pick a venue slot first') });

    const dialog = await openNewPod();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Publish pod' }));

    expect(await within(dialog).findByText('Pick a venue slot first')).toBeTruthy();
    expect(screen.getByRole('dialog')).toBe(dialog);
    expect(screen.queryByText('Pod created.')).toBeNull();
  });

  it('closes the dialog from the form’s cancel and from Escape', async () => {
    mount({});

    let dialog = await openNewPod();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Discard pod' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());

    dialog = await openNewPod();
    fireEvent.keyDown(dialog, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });
});
