import { needsConfirmation, reachesOutside, riskOf } from '../../catalog/risk';

describe('riskOf', () => {
  it('rates every query READ, whatever it is called', () => {
    expect(riskOf('QUERY', 'podsTable')).toBe('READ');
    expect(riskOf('QUERY', 'deletedPods')).toBe('READ');
    expect(riskOf('QUERY', 'cancelledPodsReport')).toBe('READ');
  });

  it.each(['deletePod', 'adminCancelPod', 'revokeMcpConnection', 'refundPayment', 'archiveClub', 'unassignHost', 'restorePodVersion', 'withdrawOffer', 'banUser'])(
    'rates the mutation %s DESTRUCTIVE',
    (field) => {
      expect(riskOf('MUTATION', field)).toBe('DESTRUCTIVE');
    }
  );

  it.each(['createPod', 'updatePod', 'joinFreePod', 'approvePaymentRelease', 'sendCampaign', 'unblockUser'])('rates the mutation %s WRITE', (field) => {
    expect(riskOf('MUTATION', field)).toBe('WRITE');
  });

  it('matches whole words only, so a word inside another word is not destructive', () => {
    // "dropdown" contains "drop", "blocked" is not "block", "Cancellation" is not "cancel".
    expect(riskOf('MUTATION', 'saveDropdownOptions')).toBe('WRITE');
    expect(riskOf('MUTATION', 'updateCancellationPolicy')).toBe('WRITE');
  });
});

describe('needsConfirmation', () => {
  it('requires confirmation for every destructive mutation', () => {
    expect(needsConfirmation('MUTATION', 'deletePod')).toBe(true);
    expect(needsConfirmation('MUTATION', 'adminCancelPod')).toBe(true);
  });

  it('requires confirmation for consequential writes: approvals, money and handed-over powers', () => {
    expect(needsConfirmation('MUTATION', 'approvePaymentRelease')).toBe(true);
    expect(needsConfirmation('MUTATION', 'payoutHost')).toBe(true);
    expect(needsConfirmation('MUTATION', 'grantPortalAccess')).toBe(true);
    expect(needsConfirmation('MUTATION', 'creditCoins')).toBe(true);
  });

  it('does not ask for confirmation on an ordinary create or edit', () => {
    expect(needsConfirmation('MUTATION', 'createPod')).toBe(false);
    expect(needsConfirmation('MUTATION', 'sendCampaign')).toBe(false);
  });

  it('never asks for confirmation on a query, even one named like an approval', () => {
    expect(needsConfirmation('QUERY', 'podsTable')).toBe(false);
    expect(needsConfirmation('QUERY', 'approvalsPending')).toBe(false);
    expect(needsConfirmation('QUERY', 'payoutSummary')).toBe(false);
  });
});

describe('reachesOutside', () => {
  it('flags mutations that message people or move money outside Duncit', () => {
    expect(reachesOutside('MUTATION', 'sendCampaign')).toBe(true);
    expect(reachesOutside('MUTATION', 'notifyHosts')).toBe(true);
    expect(reachesOutside('MUTATION', 'refundPayment')).toBe(true);
    expect(reachesOutside('MUTATION', 'triggerE2eRun')).toBe(true);
  });

  it('does not flag mutations that only change Duncit data', () => {
    expect(reachesOutside('MUTATION', 'createPod')).toBe(false);
    expect(reachesOutside('MUTATION', 'deletePod')).toBe(false);
    expect(reachesOutside('MUTATION', 'adminCancelPod')).toBe(false);
  });

  it('never flags a query, even one named like an outward action', () => {
    expect(reachesOutside('QUERY', 'podsTable')).toBe(false);
    expect(reachesOutside('QUERY', 'sentEmails')).toBe(false);
    expect(reachesOutside('QUERY', 'sendLogs')).toBe(false);
  });
});
