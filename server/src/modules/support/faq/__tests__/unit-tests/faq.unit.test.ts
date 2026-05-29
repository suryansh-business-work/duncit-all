import { faqService } from '../../faq.service';
import { faqResolvers } from '../../faq.resolver';
import { makeContext } from '@test/harness';

// Pure validation + auth-gating branches that short-circuit before any DB call.
describe('faq unit', () => {
  describe('faqService.create validation', () => {
    it('rejects when question/answer are missing', async () => {
      await expect(faqService.create({})).rejects.toThrow(/required/i);
    });

    it('rejects a PARTNERS faq without a partner topic', async () => {
      await expect(
        faqService.create({ question: 'Q', answer: 'A', audience: 'PARTNERS' })
      ).rejects.toThrow(/partner faq topic is required/i);
    });
  });

  describe('faqResolvers auth gating', () => {
    const resolvers = faqResolvers.Mutation as Record<string, any>;

    it('createFaq throws UNAUTHENTICATED without a user', () => {
      expect(() =>
        resolvers.createFaq({}, { input: { question: 'Q', answer: 'A' } }, makeContext(null))
      ).toThrow(/not authenticated/i);
    });

    it('createFaq throws FORBIDDEN for a non-admin role', () => {
      expect(() =>
        resolvers.createFaq(
          {},
          { input: { question: 'Q', answer: 'A' } },
          makeContext({ roles: ['USER'] })
        )
      ).toThrow(/access denied/i);
    });

    it('deleteFaq is role-gated', () => {
      expect(() =>
        resolvers.deleteFaq({}, { faq_doc_id: 'x' }, makeContext({ roles: ['USER'] }))
      ).toThrow(/access denied/i);
    });
  });
});
