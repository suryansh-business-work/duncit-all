/**
 * The AI-monitored audit vocabulary. The Admin and Partners monitoring pages
 * and the per-pod Activity dialog all read it, so a label, a tone or a filter
 * order changed here changes everywhere at once — which is the point.
 */
import { describe, expect, it } from 'vitest';

import {
  POD_AUDIT_ACTION_COLORS,
  POD_AUDIT_ACTION_ORDER,
  POD_AUDIT_RISK_COLORS,
  POD_AUDIT_RISK_ORDER,
  POD_AUDIT_SOURCE_ORDER,
  podAuditActionLabel,
  podAuditActionOptions,
  podAuditRiskLabel,
  podAuditRiskOptions,
  podAuditSourceLabel,
  podAuditSourceOptions,
} from '../src/pod-audit';
import type { ClubAdminTranslate } from '../src/club-admin-copy';

/** Hands back the key, so a wrong or missing key fails by name. */
const t: ClubAdminTranslate = (key) => key;

describe('the audit vocabulary', () => {
  it('lists every action, source and risk exactly once', () => {
    expect(new Set(POD_AUDIT_ACTION_ORDER).size).toBe(8);
    expect(new Set(POD_AUDIT_SOURCE_ORDER).size).toBe(5);
    expect(new Set(POD_AUDIT_RISK_ORDER).size).toBe(4);
  });

  it('tones every action and every risk', () => {
    expect(Object.keys(POD_AUDIT_ACTION_COLORS)).toHaveLength(POD_AUDIT_ACTION_ORDER.length);
    expect(Object.keys(POD_AUDIT_RISK_COLORS)).toHaveLength(POD_AUDIT_RISK_ORDER.length);
    expect(POD_AUDIT_ACTION_COLORS.DELETE).toBe('error');
    expect(POD_AUDIT_ACTION_COLORS.REJECTED).toBe('error');
    expect(POD_AUDIT_RISK_COLORS.PENDING).toBe('default');
    expect(POD_AUDIT_RISK_COLORS.HIGH).toBe('error');
  });

  it('lists the risk verdicts before the entries not yet scored', () => {
    expect(POD_AUDIT_RISK_ORDER).toEqual(['LOW', 'MEDIUM', 'HIGH', 'PENDING']);
  });
});

describe('podAuditActionLabel', () => {
  it('names every action from its own key', () => {
    expect(podAuditActionLabel('CREATE', t)).toBe('clubAdmin.audit.action.create');
    expect(podAuditActionLabel('UPDATE', t)).toBe('clubAdmin.audit.action.update');
    expect(podAuditActionLabel('RESUBMIT', t)).toBe('clubAdmin.audit.action.resubmit');
    expect(podAuditActionLabel('DELETE', t)).toBe('clubAdmin.audit.action.delete');
    expect(podAuditActionLabel('VENUE_APPROVED', t)).toBe('clubAdmin.audit.action.venueApproved');
    expect(podAuditActionLabel('VENUE_DECLINED', t)).toBe('clubAdmin.audit.action.venueDeclined');
    expect(podAuditActionLabel('COMPLETE', t)).toBe('clubAdmin.audit.action.complete');
    expect(podAuditActionLabel('REJECTED', t)).toBe('clubAdmin.audit.action.rejected');
  });
});

describe('podAuditSourceLabel', () => {
  it('names every source from its own key', () => {
    expect(podAuditSourceLabel('ADMIN', t)).toBe('clubAdmin.audit.source.admin');
    expect(podAuditSourceLabel('CLUB_ADMIN', t)).toBe('clubAdmin.audit.source.clubAdmin');
    expect(podAuditSourceLabel('HOST', t)).toBe('clubAdmin.audit.source.host');
    expect(podAuditSourceLabel('VENUE_OWNER', t)).toBe('clubAdmin.audit.source.venueOwner');
    expect(podAuditSourceLabel('SYSTEM', t)).toBe('clubAdmin.audit.source.system');
  });
});

describe('podAuditRiskLabel', () => {
  it('names every risk from its own key', () => {
    expect(podAuditRiskLabel('LOW', t)).toBe('clubAdmin.audit.risk.low');
    expect(podAuditRiskLabel('MEDIUM', t)).toBe('clubAdmin.audit.risk.medium');
    expect(podAuditRiskLabel('HIGH', t)).toBe('clubAdmin.audit.risk.high');
    expect(podAuditRiskLabel('PENDING', t)).toBe('clubAdmin.audit.risk.pending');
  });
});

describe('the filter options', () => {
  it('follow the fixed orders, one labelled row per value', () => {
    expect(podAuditActionOptions(t).map((option) => option.value)).toEqual([...POD_AUDIT_ACTION_ORDER]);
    expect(podAuditSourceOptions(t).map((option) => option.value)).toEqual([...POD_AUDIT_SOURCE_ORDER]);
    expect(podAuditRiskOptions(t).map((option) => option.value)).toEqual([...POD_AUDIT_RISK_ORDER]);
    expect(podAuditActionOptions(t)[0]).toEqual({ value: 'CREATE', label: 'clubAdmin.audit.action.create' });
    expect(podAuditSourceOptions(t)[1]).toEqual({
      value: 'CLUB_ADMIN',
      label: 'clubAdmin.audit.source.clubAdmin',
    });
    expect(podAuditRiskOptions(t).at(-1)).toEqual({ value: 'PENDING', label: 'clubAdmin.audit.risk.pending' });
  });
});
