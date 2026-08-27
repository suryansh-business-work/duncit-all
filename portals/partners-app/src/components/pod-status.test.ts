/**
 * Which pods offer a Pod Attendance action.
 *
 * Attendance is what a host is paid on, so the rule that decides whether the
 * ✅ appears on a club admin's pod row is stated once and asserted here rather
 * than left implicit in a JSX condition.
 */
import { describe, expect, it } from 'vitest';

import { canOpenPodAttendance, podRowStatus, type PodStatusFields } from './pod-status';

const pod = (over: Partial<PodStatusFields> = {}): PodStatusFields => ({
  is_active: true,
  completed_at: null,
  is_deleted: false,
  venue_approval_status: 'APPROVED',
  ...over,
});

describe('canOpenPodAttendance', () => {
  it('opens for a pod that is running — the ordinary case, whether or not its date has passed', () => {
    expect(podRowStatus(pod())).toBe('ACTIVE');
    expect(canOpenPodAttendance(pod())).toBe(true);
  });

  it('opens for a completed pod, whose roster is the record of who was there', () => {
    const completed = pod({ completed_at: '2026-08-20T12:30:00.000Z' });

    expect(podRowStatus(completed)).toBe('COMPLETED');
    expect(canOpenPodAttendance(completed)).toBe(true);
  });

  it('stays shut on a cancelled pod, which nobody attended', () => {
    expect(canOpenPodAttendance(pod({ is_deleted: true }))).toBe(false);
  });

  it('stays shut before the pod has a door — draft, awaiting the venue, or rejected by it', () => {
    expect(canOpenPodAttendance(pod({ is_active: false }))).toBe(false);
    expect(canOpenPodAttendance(pod({ venue_approval_status: 'PENDING' }))).toBe(false);
    expect(canOpenPodAttendance(pod({ venue_approval_status: 'DECLINED' }))).toBe(false);
  });

  it('reads cancellation ahead of completion, exactly as the status chip does', () => {
    const both = pod({ is_deleted: true, completed_at: '2026-08-20T12:30:00.000Z' });

    expect(podRowStatus(both)).toBe('CANCELLED');
    expect(canOpenPodAttendance(both)).toBe(false);
  });
});
