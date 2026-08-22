import type { GraphQLContext } from '@context';
import { requireRole } from '@middleware/rbac';
import { requireHuman } from '@modules/platform/captcha/captcha.guard';
import { contactService } from './contact.service';

const ADMIN_ROLES = ['SUPER_ADMIN', 'CITY_ADMIN', 'WEBSITE_MANAGER'];

export const contactResolvers = {
  Query: {
    contactSubmissions: (_p: unknown, args: { status?: any; email?: string }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_ROLES);
      return contactService.list(args.status, args.email);
    },
    contactSubmissionsTable: (_p: unknown, args: { query?: any }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_ROLES);
      return contactService.table(args.query);
    },
  },
  Mutation: {
    submitContactForm: (_p: unknown, args: { input: any }, ctx: GraphQLContext) => {
      requireHuman(ctx, args.input);
      return contactService.submit(args.input);
    },
    updateContactStatus: (_p: unknown, args: { contact_id: string; status: any }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_ROLES);
      return contactService.updateStatus(args.contact_id, args.status);
    },
  },
};
