import { toPodAuditLog, type AuditLogSource } from '../audit-log';

const source = (patch: Partial<AuditLogSource> = {}): AuditLogSource => ({
  id: 'a1',
  pod_id: 'p1',
  pod_title: 'Sunday Smash',
  club_id: 'club1',
  actor_user_id: 'u1',
  actor_name: 'Asha',
  source: 'CLUB_ADMIN',
  action: 'DELETE',
  changes: [{ field: 'title', from: 'Old', to: 'New' }],
  note: 'Venue closed',
  ai_risk: 'HIGH',
  ai_summary: 'Deleted late',
  ai_reviewed_at: '2026-10-02T10:00:00Z',
  created_at: '2026-10-01T10:00:00Z',
  ...patch,
});

describe('toPodAuditLog', () => {
  it('carries every field across as the shared audit shape', () => {
    expect(toPodAuditLog(source())).toEqual({
      id: 'a1',
      pod_id: 'p1',
      pod_title: 'Sunday Smash',
      club_id: 'club1',
      actor_user_id: 'u1',
      actor_name: 'Asha',
      source: 'CLUB_ADMIN',
      action: 'DELETE',
      changes: [{ field: 'title', from: 'Old', to: 'New' }],
      note: 'Venue closed',
      ai_risk: 'HIGH',
      ai_summary: 'Deleted late',
      ai_reviewed_at: '2026-10-02T10:00:00Z',
      created_at: '2026-10-01T10:00:00Z',
    });
  });

  it('turns missing optional ids and review time into null', () => {
    const log = toPodAuditLog(
      source({ club_id: undefined, actor_user_id: undefined, ai_reviewed_at: undefined }),
    );
    expect(log.club_id).toBeNull();
    expect(log.actor_user_id).toBeNull();
    expect(log.ai_reviewed_at).toBeNull();
    expect(
      toPodAuditLog(source({ club_id: null, actor_user_id: null, ai_reviewed_at: null })),
    ).toMatchObject({
      club_id: null,
      actor_user_id: null,
      ai_reviewed_at: null,
    });
  });

  it.each([
    ['source', 'ADMIN', 'ADMIN'],
    ['source', 'HOST', 'HOST'],
    ['action', 'RESUBMIT', 'RESUBMIT'],
    ['ai_risk', 'LOW', 'LOW'],
    ['ai_risk', 'MEDIUM', 'MEDIUM'],
  ] as const)('keeps a known %s (%s)', (field, value, expected) => {
    expect(toPodAuditLog(source({ [field]: value }))[field]).toBe(expected);
  });

  it('reads a source, action or risk this build does not know as the neutral value', () => {
    const log = toPodAuditLog(source({ source: 'ROBOT', action: 'TELEPORT', ai_risk: 'EXTREME' }));
    expect(log).toMatchObject({ source: 'SYSTEM', action: 'UPDATE', ai_risk: 'PENDING' });
  });

  it('copies the changes rather than sharing the server array', () => {
    const row = source();
    const log = toPodAuditLog(row);
    expect(log.changes).toEqual(row.changes);
    expect(log.changes).not.toBe(row.changes);
    expect(log.changes[0]).not.toBe(row.changes[0]);
  });

  it('keeps an entry with no changes', () => {
    expect(toPodAuditLog(source({ changes: [] })).changes).toEqual([]);
  });
});
