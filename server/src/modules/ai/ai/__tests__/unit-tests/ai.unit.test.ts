import { aiResolvers } from '../../ai.resolver';
import { makeContext } from '@test/harness';

describe('ai unit', () => {
  it('adminAiChat is gated to admin roles', async () => {
    await expect(
      (async () => (aiResolvers.Mutation as any).adminAiChat({}, { prompt: 'hi' }, makeContext({ roles: ['USER'] })))()
    ).rejects.toThrow(/access denied/i);
  });
});
