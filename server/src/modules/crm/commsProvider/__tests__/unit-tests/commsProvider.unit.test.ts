import { commsProviderService } from '../../commsProvider.service';
import { commsProviderResolvers } from '../../commsProvider.resolver';
import { makeContext } from '@test/harness';

describe('commsProvider unit', () => {
  it('create rejects an unsupported provider type', async () => {
    await expect(
      commsProviderService.create({ name: 'X', type: 'TELEPATHY' as any, config: {} })
    ).rejects.toThrow(/unsupported provider type/i);
  });

  it('createCommsProvider is gated to tech-manage roles', async () => {
    await expect(
      (commsProviderResolvers.Mutation as any).createCommsProvider({}, { input: {} }, makeContext({ roles: ['USER'] }))
    ).rejects.toThrow(/access denied/i);
  });
});
