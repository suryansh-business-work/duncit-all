import { addressBookService } from './addressBook.service';
import { requireAuth } from '@middleware/rbac';
import type { GraphQLContext } from '@context';

export const addressBookResolvers = {
  Query: {
    myAddresses: (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      const user = requireAuth(ctx);
      return addressBookService.listMine(user.id);
    },
  },
  Mutation: {
    saveMyAddress: (
      _p: unknown,
      args: { id?: string | null; input: any },
      ctx: GraphQLContext
    ) => {
      const user = requireAuth(ctx);
      return addressBookService.save(user.id, args.id, args.input);
    },
    deleteMyAddress: (_p: unknown, args: { id: string }, ctx: GraphQLContext) => {
      const user = requireAuth(ctx);
      return addressBookService.remove(user.id, args.id);
    },
    setDefaultMyAddress: (_p: unknown, args: { id: string }, ctx: GraphQLContext) => {
      const user = requireAuth(ctx);
      return addressBookService.setDefault(user.id, args.id);
    },
  },
};
