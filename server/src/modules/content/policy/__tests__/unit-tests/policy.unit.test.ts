import { policyService } from '../../policy.service';
import { policyResolvers } from '../../policy.resolver';
import { makeContext } from '@test/harness';

describe('policy unit', () => {
  it('create requires a title', async () => {
    await expect(policyService.create({ slug: 'terms' })).rejects.toThrow(/title is required/i);
  });

  it('create rejects an invalid slug', async () => {
    await expect(
      policyService.create({ title: 'Terms', slug: '!!!' })
    ).rejects.toThrow(/slug must be/i);
  });

  it('createPolicy is gated to legal roles', () => {
    expect(() =>
      (policyResolvers.Mutation as any).createPolicy({}, { input: {} }, makeContext({ roles: ['USER'] }))
    ).toThrow(/access denied/i);
  });
});
