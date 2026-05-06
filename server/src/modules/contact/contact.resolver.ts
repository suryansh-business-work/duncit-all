import type { GraphQLContext } from '../../context';
import { requireRole } from '../../middleware/rbac';
import { contactService } from './contact.service';

const ADMIN_ROLES = ['SUPER_ADMIN', 'CITY_ADMIN'];

export const contactResolvers = {
  Query: {
    contactSubmissions: (_p: unknown, args: { status?: any }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_ROLES);
      return contactService.list(args.status);
    },
  },
  Mutation: {
    submitContactForm: (_p: unknown, args: { input: any }) => contactService.submit(args.input),
    updateContactStatus: (_p: unknown, args: { contact_id: string; status: any }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_ROLES);
      return contactService.updateStatus(args.contact_id, args.status);
    },
  },
};
