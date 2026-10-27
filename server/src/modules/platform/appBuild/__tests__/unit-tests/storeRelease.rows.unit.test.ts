import { APPLE_AWAITING_RELEASE, appleStatus, playStatus } from '../../storeRelease.rows';

describe('appleStatus', () => {
  it.each([
    ['PREPARE_FOR_SUBMISSION', 'PREPARING'],
    ['READY_FOR_REVIEW', 'PREPARING'],
    ['WAITING_FOR_REVIEW', 'WAITING'],
    ['WAITING_FOR_EXPORT_COMPLIANCE', 'WAITING'],
    ['PENDING_CONTRACT', 'WAITING'],
    ['IN_REVIEW', 'IN_REVIEW'],
    ['ACCEPTED', 'APPROVED'],
    ['PENDING_DEVELOPER_RELEASE', 'APPROVED'],
    ['PENDING_APPLE_RELEASE', 'APPROVED'],
    ['PROCESSING_FOR_DISTRIBUTION', 'APPROVED'],
    ['PROCESSING_FOR_APP_STORE', 'APPROVED'],
    ['READY_FOR_DISTRIBUTION', 'LIVE'],
    ['READY_FOR_SALE', 'LIVE'],
    ['REPLACED_WITH_NEW_VERSION', 'REPLACED'],
    ['REJECTED', 'REJECTED'],
    ['METADATA_REJECTED', 'REJECTED'],
    ['INVALID_BINARY', 'REJECTED'],
    ['DEVELOPER_REJECTED', 'WITHDRAWN'],
    ['DEVELOPER_REMOVED_FROM_SALE', 'REMOVED'],
    ['REMOVED_FROM_SALE', 'REMOVED'],
  ])('folds %s into %s', (state, status) => {
    expect(appleStatus(state)).toBe(status);
  });

  it('shows anything unlisted as OTHER', () => {
    expect(appleStatus('SOMETHING_NEW')).toBe('OTHER');
    expect(appleStatus('')).toBe('OTHER');
  });

  it('names the one state where the store is done and a person is not', () => {
    expect(APPLE_AWAITING_RELEASE).toBe('PENDING_DEVELOPER_RELEASE');
    expect(appleStatus(APPLE_AWAITING_RELEASE)).toBe('APPROVED');
  });
});

describe('playStatus', () => {
  it.each([
    ['production', 'draft', 'PREPARING'],
    ['internal', 'halted', 'HALTED'],
    ['production', 'inProgress', 'ROLLING_OUT'],
    ['production', 'completed', 'LIVE'],
    ['internal', 'completed', 'TESTING'],
    ['beta', 'completed', 'TESTING'],
    ['production', 'unknown', 'OTHER'],
    ['production', '', 'OTHER'],
  ])('folds %s/%s into %s', (track, releaseStatus, status) => {
    expect(playStatus(track, releaseStatus)).toBe(status);
  });
});
