/**
 * The status a club admin's pod row shows, and which rows offer Pod Attendance.
 *
 * Attendance is what a host is paid on, so the rule that decides whether the
 * attendance action appears on a row is stated once and asserted here rather
 * than left implicit in a JSX condition on three surfaces.
 */
import { describe, expect, it } from 'vitest';

import {
  POD_ROW_STATUS_COLORS,
  POD_ROW_STATUS_ORDER,
  canOpenPodAttendance,
  podRowStatus,
  podRowStatusLabel,
  podRowStatusOptions,
  type PodStatusFields,
} from '../src/pod-row-status';
import type { ClubAdminTranslate } from '../src/club-admin-copy';

/** Hands back the key, so a wrong or missing key fails by name. */
const t: ClubAdminTranslate = (key) => key;

const pod = (over: Partial<PodStatusFields> = {}): PodStatusFields => ({
  is_active: true,
  completed_at: null,
  is_deleted: false,
  venue_approval_status: 'APPROVED',
  ...over,
});

describe('podRowStatus', () => {
  it('reads the booking cycle ahead of the active/draft split', () => {
    expect(podRowStatus(pod())).toBe('ACTIVE');
    expect(podRowStatus(pod({ is_active: false }))).toBe('DRAFT');
    expect(podRowStatus(pod({ venue_approval_status: 'PENDING' }))).toBe('AWAITING_VENUE');
    expect(podRowStatus(pod({ venue_approval_status: 'DECLINED' }))).toBe('VENUE_REJECTED');
    expect(podRowStatus(pod({ completed_at: '2026-08-20T12:30:00.000Z' }))).toBe('COMPLETED');
    expect(podRowStatus(pod({ is_deleted: true }))).toBe('CANCELLED');
  });

  it('reads cancellation ahead of completion', () => {
    const both = pod({ is_deleted: true, completed_at: '2026-08-20T12:30:00.000Z' });
    expect(podRowStatus(both)).toBe('CANCELLED');
  });

  it('lists every status exactly once, in the order a pod passes through them', () => {
    expect(POD_ROW_STATUS_ORDER).toEqual([
      'AWAITING_VENUE',
      'VENUE_REJECTED',
      'DRAFT',
      'ACTIVE',
      'COMPLETED',
      'CANCELLED',
    ]);
    expect(Object.keys(POD_ROW_STATUS_COLORS).toSorted((a, b) => a.localeCompare(b))).toEqual(
      [...POD_ROW_STATUS_ORDER].toSorted((a, b) => a.localeCompare(b)),
    );
  });
});

describe('canOpenPodAttendance', () => {
  it('opens for a pod that is running — whether or not its date has passed', () => {
    expect(canOpenPodAttendance(pod())).toBe(true);
  });

  it('opens for a completed pod, whose roster is the record of who was there', () => {
    expect(canOpenPodAttendance(pod({ completed_at: '2026-08-20T12:30:00.000Z' }))).toBe(true);
  });

  it('stays shut on a cancelled pod, which nobody attended', () => {
    expect(canOpenPodAttendance(pod({ is_deleted: true }))).toBe(false);
  });

  it('stays shut before the pod has a door — draft, awaiting the venue, or rejected by it', () => {
    expect(canOpenPodAttendance(pod({ is_active: false }))).toBe(false);
    expect(canOpenPodAttendance(pod({ venue_approval_status: 'PENDING' }))).toBe(false);
    expect(canOpenPodAttendance(pod({ venue_approval_status: 'DECLINED' }))).toBe(false);
  });
});

describe('podRowStatusLabel', () => {
  it('names every status from its own key', () => {
    expect(podRowStatusLabel('ACTIVE', t)).toBe('clubAdmin.podStatus.active');
    expect(podRowStatusLabel('DRAFT', t)).toBe('clubAdmin.podStatus.draft');
    expect(podRowStatusLabel('AWAITING_VENUE', t)).toBe('clubAdmin.podStatus.awaitingVenue');
    expect(podRowStatusLabel('VENUE_REJECTED', t)).toBe('clubAdmin.podStatus.venueRejected');
    expect(podRowStatusLabel('COMPLETED', t)).toBe('clubAdmin.podStatus.completed');
    expect(podRowStatusLabel('CANCELLED', t)).toBe('clubAdmin.podStatus.cancelled');
  });
});

describe('podRowStatusOptions', () => {
  it('offers "all" first, then every status in order, each with its label', () => {
    const options = podRowStatusOptions(t);
    expect(options[0]).toEqual({ value: '', label: 'clubAdmin.podStatus.all' });
    expect(options.slice(1).map((option) => option.value)).toEqual([...POD_ROW_STATUS_ORDER]);
    expect(options.at(-1)).toEqual({ value: 'CANCELLED', label: 'clubAdmin.podStatus.cancelled' });
  });
});
