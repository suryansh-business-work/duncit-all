import { aiResolvers } from '../../ai.resolver';
import { makeContext } from '@test/harness';

// The AI module talks to an external LLM, so only the role-gating branch is
// exercised here (it short-circuits before any external call).
describe('ai integration', () => {
  it('blocks adminAiChat for a non-admin before any external call', async () => {
    await expect(
      (async () => (aiResolvers.Mutation as any).adminAiChat({}, { prompt: 'hi' }, makeContext({ roles: ['USER'] })))()
    ).rejects.toThrow(/access denied/i);
  });
});
