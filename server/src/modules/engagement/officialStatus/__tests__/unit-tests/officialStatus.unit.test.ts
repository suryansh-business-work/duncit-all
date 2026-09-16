import { officialStatusResolvers } from '../../officialStatus.resolver';
import { makeContext } from '@test/harness';

describe('officialStatus resolver — access control', () => {
  it('officialStatusesTable is gated to marketing-write roles', async () => {
    await expect(
      (officialStatusResolvers.Query as any).officialStatusesTable(
        {},
        {},
        makeContext({ roles: ['USER'] })
      )
    ).rejects.toThrow(/access denied/i);
    await expect(
      (officialStatusResolvers.Query as any).officialStatusesTable({}, {}, makeContext(null))
    ).rejects.toThrow(/authenticat/i);
  });

  it('createOfficialStatus is gated to marketing-write roles', async () => {
    await expect(
      (officialStatusResolvers.Mutation as any).createOfficialStatus(
        {},
        { input: {} },
        makeContext({ roles: ['USER'] })
      )
    ).rejects.toThrow(/access denied/i);
  });

  it('updateOfficialStatus is gated to marketing-write roles', async () => {
    await expect(
      (officialStatusResolvers.Mutation as any).updateOfficialStatus(
        {},
        { status_doc_id: 'x', input: {} },
        makeContext({ roles: ['USER'] })
      )
    ).rejects.toThrow(/access denied/i);
  });

  it('deleteOfficialStatus is gated to marketing-write roles', async () => {
    await expect(
      (officialStatusResolvers.Mutation as any).deleteOfficialStatus(
        {},
        { status_doc_id: 'x' },
        makeContext({ roles: ['USER'] })
      )
    ).rejects.toThrow(/access denied/i);
  });

  it('recordOfficialStatusView requires authentication', async () => {
    await expect(
      (officialStatusResolvers.Mutation as any).recordOfficialStatusView(
        {},
        { status_doc_id: 'x' },
        makeContext(null)
      )
    ).rejects.toThrow(/authenticat/i);
  });
});
