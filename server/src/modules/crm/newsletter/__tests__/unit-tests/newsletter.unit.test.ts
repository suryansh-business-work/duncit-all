import { newsletterService } from '../../newsletter.service';
import { newsletterResolvers } from '../../newsletter.resolver';
import { makeContext } from '@test/harness';

describe('newsletter unit', () => {
  it('rejects an invalid email', async () => {
    await expect(newsletterService.subscribe({ email: 'not-an-email' })).rejects.toThrow(/invalid email/i);
  });

  it('newsletterSubscribers query is gated to admin roles', () => {
    expect(() =>
      (newsletterResolvers.Query as any).newsletterSubscribers({}, {}, makeContext({ roles: ['USER'] }))
    ).toThrow(/access denied/i);
  });
});
