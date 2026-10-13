import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import HostAutoPodsPage from './HostAutoPodsPage';
import { autoPod, hostClaim, mountQueue, venueClaim } from '../../components/auto-pods/__tests__/rows';
import type { ScriptedAnswer, SentOperation } from '../../__tests__/groupC-link';

afterEach(cleanup);

const QUEUE = 'HostAutoPods';
const queue = (rows: unknown[]) => ({ hostAutoPods: rows });

const mount = (answers: Record<string, ScriptedAnswer>, sent: SentOperation[] = []) =>
  mountQueue(<HostAutoPodsPage />, { MyHostCategoriesForAutoPod: { myHost: null }, ...answers }, sent);

const ready = autoPod({ venue_claim: venueClaim });
const taken = autoPod({ id: 'ap2', pod_title: 'Friday Football', viewer_claimed: true, venue_claim: venueClaim, host_claim: hostClaim });

describe('HostAutoPodsPage', () => {
  it('shows the offers waiting on the host apart from the ones already taken', async () => {
    mount({ [QUEUE]: queue([ready, taken]) });
    const waiting = within(await screen.findByTestId('auto-pod-section-actionable'));
    expect(waiting.getByText('Sunday Badminton')).toBeTruthy();
    expect(waiting.getByRole('button', { name: 'Assign Myself' })).toBeTruthy();
    const mine = within(screen.getByTestId('auto-pod-section-mine'));
    expect(mine.getByText('Friday Football')).toBeTruthy();
    expect(mine.getByTestId('auto-pod-withdraw')).toBeTruthy();
  });

  it('asks for the queue without a city or category at first', async () => {
    const sent: SentOperation[] = [];
    mount({ [QUEUE]: queue([]) }, sent);
    await screen.findByTestId('auto-pods-empty');
    expect(sent.find((op) => op.name === QUEUE)?.variables).toEqual({ location_id: null, sub_category_id: null });
  });

  it('says when nothing needs a host', async () => {
    mount({ [QUEUE]: queue([]) });
    expect((await screen.findByTestId('auto-pods-empty')).textContent).toBe('No Auto Pods need a host right now.');
  });

  it('reloads the queue from the retry button after a failure', async () => {
    const sent: SentOperation[] = [];
    mount({ [QUEUE]: new Error('Queue unavailable') }, sent);
    expect((await screen.findByTestId('auto-pods-error')).textContent).toContain('Could not load Auto Pods');
    fireEvent.click(screen.getByTestId('auto-pods-retry'));
    await waitFor(() => expect(sent.filter((op) => op.name === QUEUE).length).toBeGreaterThan(1));
  });

  it('opens the claim dialog for an offer', async () => {
    mount({ [QUEUE]: queue([ready]), AutoPodHostProjection: new Error('no projection') });
    fireEvent.click(await screen.findByRole('button', { name: 'Assign Myself' }));
    expect(await screen.findByRole('dialog')).toBeTruthy();
  });

  it('takes the host’s enrolment back after a confirmation and reloads', async () => {
    const sent: SentOperation[] = [];
    mount({ [QUEUE]: queue([taken]), HostWithdrawAutoPod: { hostWithdrawAutoPod: autoPod({ id: 'ap2' }) } }, sent);
    fireEvent.click(await screen.findByTestId('auto-pod-withdraw'));
    expect(await screen.findByTestId('auto-pod-withdraw-sheet')).toBeTruthy();
    const loads = sent.filter((op) => op.name === QUEUE).length;
    fireEvent.click(screen.getByTestId('auto-pod-withdraw-confirm'));

    await waitFor(() => expect(sent.some((op) => op.name === 'HostWithdrawAutoPod')).toBe(true));
    expect(sent.find((op) => op.name === 'HostWithdrawAutoPod')?.variables).toEqual({ auto_pod_doc_id: 'ap2' });
    await waitFor(() => expect(sent.filter((op) => op.name === QUEUE).length).toBeGreaterThan(loads));
  });

  it('shows the withdrawal refusal in the confirmation', async () => {
    mount({ [QUEUE]: queue([taken]), HostWithdrawAutoPod: new Error('Pod already live') });
    fireEvent.click(await screen.findByTestId('auto-pod-withdraw'));
    fireEvent.click(await screen.findByTestId('auto-pod-withdraw-confirm'));
    expect(await screen.findByTestId('auto-pod-withdraw-error')).toBeTruthy();
  });
});
