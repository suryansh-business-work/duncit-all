import { clubAdminResolvers } from '../../clubAdmin.resolver';
import { makeContext } from '@test/harness';

describe('clubAdmin unit', () => {
  it('every query requires authentication', async () => {
    await expect(
      (async () => (clubAdminResolvers.Query as any).myAdminClubs({}, {}, makeContext()))()
    ).rejects.toThrow(/not authenticated/i);
    await expect(
      (async () => (clubAdminResolvers.Query as any).clubAdminDashboard({}, {}, makeContext()))()
    ).rejects.toThrow(/not authenticated/i);
  });

  it('every pod mutation requires authentication', async () => {
    await expect(
      (async () =>
        (clubAdminResolvers.Mutation as any).clubAdminCreatePod({}, { input: {} }, makeContext()))()
    ).rejects.toThrow(/not authenticated/i);
    await expect(
      (async () =>
        (clubAdminResolvers.Mutation as any).clubAdminUpdatePod(
          {},
          { pod_doc_id: 'x', input: {} },
          makeContext()
        ))()
    ).rejects.toThrow(/not authenticated/i);
    await expect(
      (async () =>
        (clubAdminResolvers.Mutation as any).clubAdminDeletePod(
          {},
          { pod_doc_id: 'x' },
          makeContext()
        ))()
    ).rejects.toThrow(/not authenticated/i);
  });
});
