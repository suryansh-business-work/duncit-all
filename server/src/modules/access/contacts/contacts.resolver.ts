import { contactsService, type ContactEntryInput } from './contacts.service';
import { requireAuth } from '@middleware/rbac';
import type { GraphQLContext } from '@context';

export const contactsResolvers = {
  Query: {
    contactsOnDuncit: (
      _p: unknown,
      args: { search?: string | null; nearby?: boolean | null },
      ctx: GraphQLContext
    ) => {
      const user = requireAuth(ctx);
      return contactsService.listMine(user.id, args);
    },
    myContactsSync: (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      const user = requireAuth(ctx);
      return contactsService.syncStatus(user.id);
    },
  },
  Mutation: {
    syncContacts: (_p: unknown, args: { entries: ContactEntryInput[] }, ctx: GraphQLContext) => {
      const user = requireAuth(ctx);
      return contactsService.syncContacts(user.id, args.entries ?? []);
    },
    clearMyContacts: (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      const user = requireAuth(ctx);
      return contactsService.clearMine(user.id);
    },
  },
};
