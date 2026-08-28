import { describe, expect, it } from 'vitest';
import { isClubAdminOf, reportReasonNeedsDetails } from '../src/content-report';

describe('reportReasonNeedsDetails', () => {
  it('requires the words only for OTHER, which says nothing on its own', () => {
    expect(reportReasonNeedsDetails('OTHER')).toBe(true);
  });

  it('leaves the details optional for every reason that already names the problem', () => {
    expect(reportReasonNeedsDetails('SPAM')).toBe(false);
    expect(reportReasonNeedsDetails('HARASSMENT')).toBe(false);
    expect(reportReasonNeedsDetails(null)).toBe(false);
  });
});

describe('isClubAdminOf', () => {
  const admins = [{ id: 'admin-1' }, { id: 'admin-2' }];

  it('recognises an assigned admin', () => {
    expect(isClubAdminOf(admins, 'admin-2')).toBe(true);
  });

  it('refuses a member who is not on the club admin list', () => {
    expect(isClubAdminOf(admins, 'member-9')).toBe(false);
  });

  it('refuses a signed-out viewer before it looks at the list at all', () => {
    expect(isClubAdminOf(admins, null)).toBe(false);
    expect(isClubAdminOf(admins, undefined)).toBe(false);
    expect(isClubAdminOf(admins, '')).toBe(false);
  });

  it('treats a club with no admins loaded as a club this viewer cannot administer', () => {
    expect(isClubAdminOf(null, 'admin-1')).toBe(false);
    expect(isClubAdminOf(undefined, 'admin-1')).toBe(false);
    expect(isClubAdminOf([], 'admin-1')).toBe(false);
  });
});
