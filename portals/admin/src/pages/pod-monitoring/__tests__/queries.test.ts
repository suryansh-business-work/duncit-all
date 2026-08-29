import { describe, expect, it } from 'vitest';
import {
  ACTION_COLORS,
  ACTION_LABELS,
  ACTION_OPTIONS,
  fmtWhen,
  RISK_COLORS,
  RISK_OPTIONS,
  SOURCE_LABELS,
  SOURCE_OPTIONS,
} from '../queries';

describe('pod-monitoring queries — fmtWhen', () => {
  it('formats a real ISO timestamp through the admin-configured formatter', () => {
    const formatted = fmtWhen('2026-03-04T10:15:00.000Z');
    expect(formatted).not.toBe('—');
    expect(formatted.length).toBeGreaterThan(0);
  });

  it('dashes out a null timestamp', () => {
    expect(fmtWhen(null)).toBe('—');
  });

  it('dashes out an undefined timestamp', () => {
    expect(fmtWhen(undefined)).toBe('—');
  });

  it('dashes out an empty-string timestamp', () => {
    expect(fmtWhen('')).toBe('—');
  });
});

describe('pod-monitoring queries — enum vocabularies', () => {
  it('labels every audit action', () => {
    expect(ACTION_LABELS).toEqual({
      CREATE: 'Created',
      UPDATE: 'Edited',
      RESUBMIT: 'Resubmitted',
      DELETE: 'Deleted',
      VENUE_APPROVED: 'Venue Approved',
      VENUE_DECLINED: 'Venue Rejected',
      COMPLETE: 'Completed',
      REJECTED: 'Content Blocked',
    });
  });

  it('colors every audit action', () => {
    expect(ACTION_COLORS).toEqual({
      CREATE: 'success',
      UPDATE: 'info',
      RESUBMIT: 'info',
      DELETE: 'error',
      VENUE_APPROVED: 'success',
      VENUE_DECLINED: 'warning',
      COMPLETE: 'default',
      REJECTED: 'error',
    });
  });

  it('colors every AI risk level', () => {
    expect(RISK_COLORS).toEqual({ PENDING: 'default', LOW: 'success', MEDIUM: 'warning', HIGH: 'error' });
  });

  it('labels every audit source', () => {
    expect(SOURCE_LABELS).toEqual({
      ADMIN: 'Admin Portal',
      CLUB_ADMIN: 'Club Admin',
      HOST: 'Host',
      VENUE_OWNER: 'Venue Owner',
      SYSTEM: 'System',
    });
  });

  it('derives ACTION_OPTIONS from ACTION_LABELS, one option per action', () => {
    expect(ACTION_OPTIONS).toEqual(
      Object.entries(ACTION_LABELS).map(([value, label]) => ({ value, label })),
    );
  });

  it('derives RISK_OPTIONS in the fixed LOW/MEDIUM/HIGH/PENDING order', () => {
    expect(RISK_OPTIONS).toEqual([
      { value: 'LOW', label: 'LOW' },
      { value: 'MEDIUM', label: 'MEDIUM' },
      { value: 'HIGH', label: 'HIGH' },
      { value: 'PENDING', label: 'PENDING' },
    ]);
  });

  it('derives SOURCE_OPTIONS from SOURCE_LABELS, one option per source', () => {
    expect(SOURCE_OPTIONS).toEqual(
      Object.entries(SOURCE_LABELS).map(([value, label]) => ({ value, label })),
    );
  });
});
