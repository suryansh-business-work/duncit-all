import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import ClubAdminAutoPodsPage from './ClubAdminAutoPodsPage';
import { autoPod, clubClaim, hostClaim, mountQueue, venueClaim } from '../../components/auto-pods/__tests__/rows';
import type { ScriptedAnswer, SentOperation } from '../../__tests__/groupC-link';

afterEach(cleanup);

const QUEUE = 'ClubAdminAutoPods';
const queue = (rows: unknown[]) => ({ clubAdminAutoPods: rows });

const mount = (answers: Record<string, ScriptedAnswer>, sent: SentOperation[] = []) =>
  mountQueue(
    <ClubAdminAutoPodsPage />,
    {
      MyAdminClubsForAutoPod: {
        myAdminClubs: [{ __typename: 'Club', id: 'club1', club_name: 'Smash Club', category_id: 'sub1', location_id: 'loc1' }],
      },
      ...answers,
    },
    sent,
  );

const ready = autoPod({ venue_claim: venueClaim, host_claim: hostClaim });

describe('ClubAdminAutoPodsPage', () => {
  it('lists the offers a club may claim and asks without a city filter', async () => {
    const sent: SentOperation[] = [];
    mount({ [QUEUE]: queue([ready]) }, sent);
    const waiting = within(await screen.findByTestId('auto-pod-section-actionable'));
    expect(waiting.getByText('Sunday Badminton')).toBeTruthy();
    expect(waiting.getByRole('button', { name: 'Claim for my club' })).toBeTruthy();
    expect(sent.find((op) => op.name === QUEUE)?.variables).toEqual({ location_id: null });
  });

  it('says when no offer needs a club', async () => {
    mount({ [QUEUE]: queue([]) });
    expect((await screen.findByTestId('auto-pods-empty')).textContent).toBe('No Auto Pods need a club right now.');
  });

  it('claims an offer for one of the admin’s clubs and reloads', async () => {
    const sent: SentOperation[] = [];
    mount({ [QUEUE]: queue([ready]), ClubClaimAutoPod: { clubClaimAutoPod: autoPod({ viewer_claimed: true, club_claim: clubClaim }) } }, sent);
    fireEvent.click(await screen.findByRole('button', { name: 'Claim for my club' }));
    expect(await screen.findByTestId('auto-pod-club-claim-dialog')).toBeTruthy();
    const loads = sent.filter((op) => op.name === QUEUE).length;
    fireEvent.click(screen.getByTestId('auto-pod-club-claim-confirm'));

    await waitFor(() => expect(sent.some((op) => op.name === 'ClubClaimAutoPod')).toBe(true));
    expect(sent.find((op) => op.name === 'ClubClaimAutoPod')?.variables).toEqual({ auto_pod_doc_id: 'ap1', club_id: 'club1' });
    await waitFor(() => expect(sent.filter((op) => op.name === QUEUE).length).toBeGreaterThan(loads));
  });

  it('links a finished offer to the club’s own pod page', async () => {
    const done = autoPod({
      id: 'ap9',
      pod_title: 'Finished Pod',
      stage: 'LIVE',
      viewer_claimed: true,
      pod_id: 'pod7',
      venue_claim: venueClaim,
      host_claim: hostClaim,
      club_claim: clubClaim,
    });
    mount({ [QUEUE]: queue([done]) });
    const mine = within(await screen.findByTestId('auto-pod-section-mine'));
    expect(mine.getByRole('link', { name: 'View pod' }).getAttribute('href')).toBe('/club-admin/clubs/club1/pods/pod7');
  });

  it('shows how a cancelled or expired offer ended, with no pod link', async () => {
    const cancelled = autoPod({ id: 'ap4', pod_title: 'Cancelled Pod', stage: 'CANCELLED', viewer_claimed: true, club_claim: clubClaim });
    const expired = autoPod({ id: 'ap5', pod_title: 'Expired Pod', stage: 'EXPIRED', viewer_claimed: true, club_claim: clubClaim });
    mount({ [QUEUE]: queue([cancelled, expired]) });
    const mine = within(await screen.findByTestId('auto-pod-section-mine'));
    const chips = mine.getAllByText(/Cancelled|Expired/, { selector: '.MuiChip-label' }).map((el) => el.textContent);
    expect(chips).toHaveLength(2);
    expect(mine.queryByRole('link')).toBeNull();
  });
});
