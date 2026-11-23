/**
 * Who may do what: access levels from roles, the approval rule (four-eyes on
 * production), file visibility, and what a turn may reach.
 */
import type { GraphQLContext } from '@context';
import { actorFromUser, atLeast, intelLevel, requireIntel } from '../../access/intel.access';
import { mayDecide, needsFourEyes } from '../../approvals/intelApproval.rules';
import { allowedEnvironments, allowedSources, connectorVisible } from '../../chat/intel.context';
import { canManageFile, canViewFile, normalizeFolder, viewableFilter } from '../../media/intelMedia.access';
import type { IntelRolePolicy } from '../../settings/intelSettings.types';

const user = (roles: string[], id = 'u1') => ({ id, roles });
const ctx = (roles: string[] | null) => ({ user: roles ? user(roles) : null }) as unknown as GraphQLContext;

describe('intelLevel / requireIntel', () => {
  it('maps roles to levels, SUPER_ADMIN first', () => {
    expect(intelLevel(['INTEL_USER'])).toBe('EMPLOYEE');
    expect(intelLevel(['INTEL_USER', 'INTEL_MANAGER'])).toBe('ADMIN');
    expect(intelLevel(['SUPER_ADMIN'])).toBe('SUPER_ADMIN');
    expect(intelLevel(['TECH_MANAGER'])).toBeNull();
  });

  it('ranks levels', () => {
    expect(atLeast('ADMIN', 'EMPLOYEE')).toBe(true);
    expect(atLeast('EMPLOYEE', 'ADMIN')).toBe(false);
    expect(atLeast(null, 'EMPLOYEE')).toBe(false);
  });

  it('refuses anonymous callers, people without an Intel role and employees on admin fields', () => {
    expect(() => requireIntel(ctx(null))).toThrow(/Not authenticated/);
    expect(() => requireIntel(ctx(['FINANCE_MANAGER']))).toThrow(/do not have access/);
    expect(() => requireIntel(ctx(['INTEL_USER']), 'ADMIN')).toThrow(/do not have access/);
    expect(requireIntel(ctx(['INTEL_MANAGER']), 'ADMIN').level).toBe('ADMIN');
  });

  it('does the same for plain-HTTP routes', () => {
    expect(actorFromUser(null)).toBeNull();
    expect(actorFromUser(user(['CLUB_ADMIN']))).toBeNull();
    expect(actorFromUser(user(['INTEL_USER']))?.level).toBe('EMPLOYEE');
  });
});

describe('mayDecide (approvals)', () => {
  const base = { deciderId: 'admin', requesterId: 'emp', environment: 'PRODUCTION', fourEyes: true };
  it('lets an admin other than the requester approve a production change', () => {
    expect(mayDecide({ ...base, deciderLevel: 'ADMIN' }).ok).toBe(true);
  });

  it('never lets the requester approve their own production change under four-eyes — Super Admin included', () => {
    expect(mayDecide({ ...base, deciderId: 'emp', deciderLevel: 'SUPER_ADMIN', requesterId: 'emp' }).ok).toBe(false);
  });

  it('lets the requester approve their own production change only when four-eyes is off', () => {
    expect(mayDecide({ ...base, deciderId: 'emp', requesterId: 'emp', deciderLevel: 'ADMIN', fourEyes: false }).ok).toBe(true);
  });

  it('refuses employees on production, and strangers on staging', () => {
    expect(mayDecide({ ...base, deciderLevel: 'EMPLOYEE' }).ok).toBe(false);
    expect(mayDecide({ deciderId: 'other', deciderLevel: 'EMPLOYEE', requesterId: 'emp', environment: 'STAGING', fourEyes: false }).ok).toBe(false);
  });

  it('lets the requester or an admin decide a staging change', () => {
    expect(mayDecide({ deciderId: 'emp', deciderLevel: 'EMPLOYEE', requesterId: 'emp', environment: 'STAGING', fourEyes: false }).ok).toBe(true);
    expect(mayDecide({ deciderId: 'admin', deciderLevel: 'ADMIN', requesterId: 'emp', environment: 'STAGING', fourEyes: false }).ok).toBe(true);
  });

  it('needs four-eyes only on production with the setting on', () => {
    expect(needsFourEyes('PRODUCTION', true)).toBe(true);
    expect(needsFourEyes('PRODUCTION', false)).toBe(false);
    expect(needsFourEyes('STAGING', true)).toBe(false);
  });
});

describe('file permissions', () => {
  const emp = { user: user(['INTEL_USER'], 'emp'), level: 'EMPLOYEE' as const };
  const admin = { user: user(['INTEL_MANAGER'], 'admin'), level: 'ADMIN' as const };
  const sa = { user: user(['SUPER_ADMIN'], 'sa'), level: 'SUPER_ADMIN' as const };
  const file = (visibility: 'PRIVATE' | 'TEAM' | 'ADMINS', owner = 'owner') => ({ owner_id: owner as never, visibility });

  it('keeps private files to their owner (and Super Admins)', () => {
    expect(canViewFile(emp, file('PRIVATE'))).toBe(false);
    expect(canViewFile(admin, file('PRIVATE'))).toBe(false);
    expect(canViewFile(emp, file('PRIVATE', 'emp'))).toBe(true);
    expect(canViewFile(sa, file('PRIVATE'))).toBe(true);
  });

  it('shows team files to everyone and admin files to admins', () => {
    expect(canViewFile(emp, file('TEAM'))).toBe(true);
    expect(canViewFile(emp, file('ADMINS'))).toBe(false);
    expect(canViewFile(admin, file('ADMINS'))).toBe(true);
  });

  it('lets only the owner or a Super Admin change a file', () => {
    expect(canManageFile(admin, file('TEAM'))).toBe(false);
    expect(canManageFile(emp, file('TEAM', 'emp'))).toBe(true);
    expect(canManageFile(sa, file('TEAM'))).toBe(true);
  });

  it('builds the list filter to match', () => {
    expect(viewableFilter(sa)).toEqual({});
    expect(viewableFilter(emp)).toEqual({ $or: [{ owner_id: 'emp' }, { visibility: 'TEAM' }] });
    expect(viewableFilter(admin)).toEqual({ $or: [{ owner_id: 'admin' }, { visibility: 'TEAM' }, { visibility: 'ADMINS' }] });
  });

  it('normalises folder paths and drops traversal', () => {
    expect(normalizeFolder('')).toBe('/');
    expect(normalizeFolder('Reports//2026/')).toBe('/Reports/2026');
    expect(normalizeFolder('/a/../../etc/./passwd')).toBe('/a/etc/passwd');
  });
});

describe('turn reach', () => {
  const employee: IntelRolePolicy = { environments: ['STAGING'], sources: ['MEDIA', 'GITHUB'], can_request_writes: false, messages_per_day: 10 };
  it('narrows the chosen environment to what the policy allows', () => {
    expect(allowedEnvironments('BOTH', employee)).toEqual(['STAGING']);
    expect(allowedEnvironments('PRODUCTION', employee)).toEqual([]);
  });

  it('narrows the chosen sources to the policy; none chosen = all allowed', () => {
    expect(allowedSources([], employee)).toEqual(['GITHUB', 'MEDIA']);
    expect(allowedSources(['MONGODB', 'MEDIA'], employee)).toEqual(['MEDIA']);
  });

  it('shows a connector only when enabled, of an allowed source and environment', () => {
    expect(connectorVisible({ kind: 'GITHUB', environment: 'BOTH', enabled: true }, ['STAGING'], ['GITHUB'])).toBe(true);
    expect(connectorVisible({ kind: 'MONGODB', environment: 'PRODUCTION', enabled: true }, ['STAGING'], ['MONGODB'])).toBe(false);
    expect(connectorVisible({ kind: 'GITHUB', environment: 'STAGING', enabled: false }, ['STAGING'], ['GITHUB'])).toBe(false);
  });
});
