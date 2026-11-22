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

  it('requires confirmation before muting, holding or hanging up a live CRM call', () => {
    expect(needsConfirmation('MUTATION', 'controlCrmCall')).toBe(true);
    expect(reachesOutside('MUTATION', 'controlCrmCall')).toBe(true);
  });

  it('treats the AI Library prompt tools by what they do to the prompt', () => {
    // Publishing a prompt to anyone with the link needs a person's yes...
    expect(needsConfirmation('MUTATION', 'enableAiPromptPublicShare')).toBe(true);
    // ...as do archiving it, taking the link down and copying an old version back.
    expect(riskOf('MUTATION', 'archiveAiPrompt')).toBe('DESTRUCTIVE');
    expect(riskOf('MUTATION', 'disableAiPromptPublicShare')).toBe('DESTRUCTIVE');
    expect(riskOf('MUTATION', 'restoreAiPromptVersion')).toBe('DESTRUCTIVE');
    // Bringing it back from the archive or scoring it is an ordinary write.
    expect(riskOf('MUTATION', 'unarchiveAiPrompt')).toBe('WRITE');
    expect(needsConfirmation('MUTATION', 'unarchiveAiPrompt')).toBe(false);
    expect(needsConfirmation('MUTATION', 'scoreAiPrompt')).toBe(false);
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

describe('money-out mutations (withdrawals and Send Money)', () => {
  it.each(['decideWithdrawal', 'reviewWithdrawal', 'sendMoney', 'retryWithdrawalPayout', 'retrySendMoneyTransfer'])(
    'requires the person to confirm %s before it runs',
    (field) => {
      expect(needsConfirmation('MUTATION', field)).toBe(true);
    }
  );

  it('does not ask for confirmation to read the review dialog, the audit trail or the transfer log', () => {
    for (const field of ['withdrawalReview', 'payoutAuditTable', 'sendMoneyTransfersTable', 'sendMoneyRecipients']) {
      expect(needsConfirmation('QUERY', field)).toBe(false);
      expect(riskOf('QUERY', field)).toBe('READ');
    }
  });

  it('tells the caller Send Money reaches outside Duncit', () => {
    expect(reachesOutside('MUTATION', 'sendMoney')).toBe(true);
    expect(reachesOutside('MUTATION', 'retryWithdrawalPayout')).toBe(true);
  });
});
