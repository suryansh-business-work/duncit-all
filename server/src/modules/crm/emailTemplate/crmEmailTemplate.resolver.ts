import { crmEmailTemplateService } from './crmEmailTemplate.service';
import { CRM_RW } from '@modules/crm/crm/crm.constants';
import type { GraphQLContext } from '@context';
import { requireRole } from '@middleware/rbac';

const RW = [...CRM_RW];

export const crmEmailTemplateResolvers = {
  Query: {
    crmEmailTemplates: (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, RW);
      return crmEmailTemplateService.list();
    },
    crmEmailTemplatesTable: (_p: unknown, args: { query?: any }, ctx: GraphQLContext) => {
      requireRole(ctx, RW);
      return crmEmailTemplateService.table(args.query);
    },
    crmEmailTemplate: (_p: unknown, args: { template_id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, RW);
      return crmEmailTemplateService.byId(args.template_id);
    },
    renderCrmEmailTemplate: (_p: unknown, args: { mjml: string; vars?: string | null }, ctx: GraphQLContext) => {
      requireRole(ctx, RW);
      return crmEmailTemplateService.render(args.mjml, args.vars);
    },
  },
  Mutation: {
    createCrmEmailTemplate: (_p: unknown, args: { input: any }, ctx: GraphQLContext) => {
      const user = requireRole(ctx, RW);
      return crmEmailTemplateService.create(args.input, user.id);
    },
    updateCrmEmailTemplate: (_p: unknown, args: { template_id: string; input: any }, ctx: GraphQLContext) => {
      requireRole(ctx, RW);
      return crmEmailTemplateService.update(args.template_id, args.input);
    },
    deleteCrmEmailTemplate: (_p: unknown, args: { template_id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, RW);
      return crmEmailTemplateService.delete(args.template_id);
    },
    sendCrmTestEmail: (_p: unknown, args: { template_id: string; to: string; vars?: string | null }, ctx: GraphQLContext) => {
      requireRole(ctx, RW);
      return crmEmailTemplateService.sendTest(args.template_id, args.to, args.vars);
    },
    addCrmEmailTemplateImage: (_p: unknown, args: { template_id: string; image: { url: string; name?: string | null } }, ctx: GraphQLContext) => {
      requireRole(ctx, RW);
      return crmEmailTemplateService.addImage(args.template_id, args.image);
    },
    removeCrmEmailTemplateImage: (_p: unknown, args: { template_id: string; url: string }, ctx: GraphQLContext) => {
      requireRole(ctx, RW);
      return crmEmailTemplateService.removeImage(args.template_id, args.url);
    },
  },
};
