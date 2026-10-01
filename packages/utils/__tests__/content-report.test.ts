import { describe, expect, it } from 'vitest';
import {
  canMarkReportOk,
  canTakeDownReport,
  isClubAdminOf,
  reportReasonNeedsDetails,
  reportSubmitError,
  type ReportDecisionState,
} from '../src/content-report';

const NUDITY = { requires_details: false };
const SOMETHING_ELSE = { requires_details: true };
const REMOVED_AT = '2026-10-01T09:30:00.000Z';
const OPEN: ReportDecisionState = {
  target_type: 'POST',
  status: 'RECEIVED',
  target_live: true,
  target_removed_at: null,
};

describe('reportReasonNeedsDetails', () => {
  it('requires the words for a category Legal marked as saying nothing on its own', () => {
    expect(reportReasonNeedsDetails(SOMETHING_ELSE)).toBe(true);
  });

  it('leaves the details optional for a category that already names the problem', () => {
    expect(reportReasonNeedsDetails(NUDITY)).toBe(false);
  });

  it('asks for nothing before a category has been picked', () => {
    expect(reportReasonNeedsDetails(null)).toBe(false);
    expect(reportReasonNeedsDetails(undefined)).toBe(false);
  });
});

describe('reportSubmitError', () => {
  it('names the missing category before anything else', () => {
    expect(reportSubmitError(null, 'It copies my photo')).toBe('contentReport.reasonRequired');
    expect(reportSubmitError(undefined, '')).toBe('contentReport.reasonRequired');
  });

  it('asks for the words when the picked category requires them', () => {
    expect(reportSubmitError(SOMETHING_ELSE, '')).toBe('contentReport.detailsRequired');
    expect(reportSubmitError(SOMETHING_ELSE, '   ')).toBe('contentReport.detailsRequired');
  });

  it('lets a report go once the category has what it needs', () => {
    expect(reportSubmitError(SOMETHING_ELSE, 'It copies my photo')).toBeNull();
    expect(reportSubmitError(NUDITY, '')).toBeNull();
  });
});

describe('canTakeDownReport', () => {
  it('offers the take-down for a post or story that is still ours to remove', () => {
    expect(canTakeDownReport({ ...OPEN, target_type: 'POST' })).toBe(true);
    expect(canTakeDownReport({ ...OPEN, target_type: 'STORY' })).toBe(true);
  });

  it('withholds it once the content is no longer up', () => {
    expect(canTakeDownReport({ ...OPEN, target_live: false })).toBe(false);
    expect(
      canTakeDownReport({ ...OPEN, target_live: false, target_removed_at: REMOVED_AT })
    ).toBe(false);
  });

  it('withholds it for content the report desk cannot remove', () => {
    expect(canTakeDownReport({ ...OPEN, target_type: 'CLUB' })).toBe(false);
  });
});

describe('canMarkReportOk', () => {
  it('lets a reviewer rule that content still standing is fine', () => {
    expect(canMarkReportOk(OPEN)).toBe(true);
    expect(canMarkReportOk({ ...OPEN, status: 'IN_REVIEW' })).toBe(true);
  });

  it('refuses to call content fine after it was taken down', () => {
    expect(
      canMarkReportOk({ ...OPEN, target_live: false, target_removed_at: REMOVED_AT })
    ).toBe(false);
  });

  it('has nothing left to rule on once the report is dismissed', () => {
    expect(canMarkReportOk({ ...OPEN, status: 'DISMISSED' })).toBe(false);
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
