import { podAuditResolvers } from '../../podAudit.resolver';
import { makeContext } from '@test/harness';

describe('podAudit resolvers — role gates', () => {
  it('podAuditLogsTable is admin-gated', async () => {
    await expect(
      (async () => (podAuditResolvers.Query as any).podAuditLogsTable({}, {}, makeContext(null)))()
    ).rejects.toThrow(/not authenticated/i);
    await expect(
      (async () => (podAuditResolvers.Query as any).podAuditLogsTable({}, {}, makeContext({ roles: ['USER'] })))()
    ).rejects.toThrow(/access denied/i);
  });

  it('clubAdminPodAuditLogsTable needs CLUB_ADMIN (or SUPER_ADMIN)', async () => {
    await expect(
      (async () =>
        (podAuditResolvers.Query as any).clubAdminPodAuditLogsTable({}, {}, makeContext(null)))()
    ).rejects.toThrow(/not authenticated/i);
    await expect(
      (async () =>
        (podAuditResolvers.Query as any).clubAdminPodAuditLogsTable({}, {}, makeContext({ roles: ['USER'] })))()
    ).rejects.toThrow(/access denied/i);
  });

  it('podAuditLogs is admin-gated', async () => {
    await expect(
      (async () =>
        (podAuditResolvers.Query as any).podAuditLogs({}, { pod_doc_id: 'x' }, makeContext({ roles: ['HOST'] })))()
    ).rejects.toThrow(/access denied/i);
  });
});
