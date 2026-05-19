import { faqService } from './faq.service';
import { faqSubmissionService } from './faqSubmission.service';
import { CategoryModel } from '../category/category.model';
import type { GraphQLContext } from '../../context';
import { requireRole } from '../../middleware/rbac';

const ADMIN_RW = ['SUPER_ADMIN', 'CITY_ADMIN'];

const toCatPub = (c: any) => ({
  id: String(c._id),
  name: c.name,
  slug: c.slug,
  icon: c.icon || '',
  description: c.description || '',
  media: c.media || [],
  level: c.level,
  parent_id: c.parent_id ? String(c.parent_id) : null,
  is_active: c.is_active,
  is_system: c.is_system,
  sort_order: c.sort_order,
  created_at: c.created_at.toISOString(),
  updated_at: c.updated_at.toISOString(),
});

export const faqResolvers = {
  Faq: {
    super_category: async (parent: any) => {
      if (!parent.super_category_id) return null;
      const c = await CategoryModel.findById(parent.super_category_id);
      return c ? toCatPub(c) : null;
    },
  },
  FaqGroup: {
    super_category: (parent: any) => (parent.super_category ? toCatPub(parent.super_category) : null),
  },
  Query: {
    faqs: (_p: unknown, args: { filter?: any }) => faqService.list(args.filter),
    faq: (_p: unknown, args: { faq_doc_id: string }) => faqService.getById(args.faq_doc_id),
    publicFaqGroups: () => faqService.publicGroups(),
    publicPartnerFaqs: (_p: unknown, args: { topic?: any }) => faqService.publicPartnerFaqs(args.topic),
    faqSubmissions: (_p: unknown, args: { status?: any }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_RW);
      return faqSubmissionService.list(args.status);
    },
  },
  Mutation: {
    createFaq: (_p: unknown, args: { input: any }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_RW);
      return faqService.create(args.input);
    },
    updateFaq: (_p: unknown, args: { faq_doc_id: string; input: any }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_RW);
      return faqService.update(args.faq_doc_id, args.input);
    },
    deleteFaq: (_p: unknown, args: { faq_doc_id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_RW);
      return faqService.remove(args.faq_doc_id);
    },
    submitFaqQuestion: (_p: unknown, args: { input: any }) => faqSubmissionService.submit(args.input),
    updateFaqSubmissionStatus: (
      _p: unknown,
      args: { faq_submission_id: string; status: any; converted_faq_id?: string | null },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, ADMIN_RW);
      return faqSubmissionService.setStatus(args.faq_submission_id, args.status, args.converted_faq_id);
    },
  },
};
