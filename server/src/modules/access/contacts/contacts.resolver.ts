import { contactsService, type ContactEntryInput, type ContactSyncBatch } from './contacts.service';
import { contactsInviteService } from './contacts.invite';
import { requireAuth } from '@middleware/rbac';
import type { GraphQLContext } from '@context';

interface PageArgs {
  offset?: number | null;
  limit?: number | null;
}

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
    contactsOnDuncitPage: (_p: unknown, args: PageArgs, ctx: GraphQLContext) => {
      const user = requireAuth(ctx);
      return contactsService.listPage(user.id, args.offset, args.limit);
    },
    myContactsSync: (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      const user = requireAuth(ctx);
      return contactsService.syncStatus(user.id);
    },
    contactsToInvite: (
      _p: unknown,
      args: { search?: string | null },
      ctx: GraphQLContext
    ) => {
      const user = requireAuth(ctx);
      return contactsInviteService.listInvitable(user.id, args.search);
    },
    contactsToInvitePage: (_p: unknown, args: PageArgs, ctx: GraphQLContext) => {
      const user = requireAuth(ctx);
      return contactsInviteService.listInvitablePage(user.id, args.offset, args.limit);
    },
  },
  Mutation: {
    syncContacts: (
      _p: unknown,
      args: { entries: ContactEntryInput[]; batch?: ContactSyncBatch | null },
      ctx: GraphQLContext
    ) => {
      const user = requireAuth(ctx);
      return contactsService.syncContacts(user.id, args.entries ?? [], args.batch);
    },
    inviteContacts: (
      _p: unknown,
      args: { phone_keys?: string[] | null },
      ctx: GraphQLContext
    ) => {
      const user = requireAuth(ctx);
      return contactsInviteService.inviteContacts(user.id, args.phone_keys ?? []);
    },
    clearMyContacts: (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      const user = requireAuth(ctx);
      return contactsService.clearMine(user.id);
    },
  },
};
