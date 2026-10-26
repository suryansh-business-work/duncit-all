import { deniedReason } from '../../catalog/denylist';

describe('deniedReason — fields named one by one', () => {
  it.each([
    ['staffCallIceServers', 'returns TURN relay credentials'],
    ['downloadIosSigningFile', 'returns an iOS signing certificate'],
    ['requestDbBackupDownload', 'returns a link to a full database archive'],
    ['startE2eRun', 'hands the E2E workflow its test credentials; CI only'],
    ['attachStaffCallRecording', 'called by the call recorder, not a person'],
  ])('refuses %s with its own reason', (field, reason) => {
    expect(deniedReason(field)).toBe(reason);
  });

  it.each(['mcpAuthorizationRequest', 'approveMcpAuthorization', 'denyMcpAuthorization', 'revokeMcpConnection', 'updateMcpSettings'])(
    'keeps the MCP console decision %s away from the AI it constrains',
    (field) => {
      expect(deniedReason(field)).toEqual(expect.any(String));
    }
  );

  it('matches a named field exactly, not by prefix or case', () => {
    expect(deniedReason('staffCallIceServersCount')).toBeNull();
    expect(deniedReason('StaffCallIceServers')).toBeNull();
  });
});

describe('deniedReason — word rules', () => {
  it.each([
    ['resetUserPassword', 'passwords are set by the person'],
    ['verifyOtp', 'one-time codes are for the person to receive'],
    ['createApiToken', 'tokens are credentials'],
    ['listPushTokens', 'tokens are credentials'],
    ['login', 'signing in is for the person'],
    ['adminLogout', 'signing out is for the person'],
    ['signupWithEmail', 'signing up is for the person'],
    ['seedDemoPods', 'seeding is a deploy step'],
    ['impersonateUser', 'acting as someone else is not delegated'],
    ['rotateWebhookSecret', 'secrets never leave the server'],
    ['saveSmtpCredentials', 'credentials never leave the server'],
    ['uploadBase64Image', 'whole files do not belong in a chat context'],
  ])('refuses %s (%s)', (field, reason) => {
    expect(deniedReason(field)).toBe(reason);
  });

  it('matches whole words, so a field that merely contains the letters stays exposed', () => {
    expect(deniedReason('podSeedlingIdeas')).toBeNull();
    expect(deniedReason('secretaryContacts')).toBeNull();
    expect(deniedReason('loginActivityTable')).not.toBeNull(); // "login" IS a word here
    expect(deniedReason('blogInsights')).toBeNull();
  });
});

describe('deniedReason — word pairs', () => {
  it('refuses two-factor setup only when "two" is directly followed by "factor"', () => {
    expect(deniedReason('enableTwoFactor')).toBe('two-factor setup is for the person');
    expect(deniedReason('twoFactorStatus')).toBe('two-factor setup is for the person');
    expect(deniedReason('factorTwoScores')).toBeNull();
    expect(deniedReason('twoPodFactor')).toBeNull();
  });

  it('refuses signing out written as two words', () => {
    expect(deniedReason('signOutEverywhere')).toBe('signing out is for the person');
    expect(deniedReason('signOffSheet')).toBeNull();
  });
});

describe('deniedReason — the everyday API stays exposed', () => {
  it.each(['createPod', 'podsTable', 'clubsTable', 'venueSlots', 'joinFreePod', 'approvePaymentRelease', 'deletePod', 'mcpUsageSummary'])(
    '%s is allowed',
    (field) => {
      expect(deniedReason(field)).toBeNull();
    }
  );
});
