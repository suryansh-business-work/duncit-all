import { hostResolvers } from '../../host.resolver';
import { makeContext } from '@test/harness';

describe('host unit', () => {
  it('hosts query is gated to admin review roles', async () => {
    await expect(
      (hostResolvers.Query as any).hosts({}, {}, makeContext({ roles: ['USER'] }))
    ).rejects.toThrow(/access denied/i);
  });

  it('approveHost is gated to admin review roles', async () => {
    await expect(
      (hostResolvers.Mutation as any).approveHost({}, { host_doc_id: 'x' }, makeContext({ roles: ['USER'] }))
    ).rejects.toThrow(/access denied/i);
  });
});
