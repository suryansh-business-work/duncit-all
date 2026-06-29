import { searchService, type DiscoveryInput } from './search.service';
import type { GraphQLContext } from '@context';

export const searchResolvers = {
  Query: {
    searchDiscovery: (
      _p: unknown,
      args: { input?: DiscoveryInput | null },
      ctx: GraphQLContext,
    ) => searchService.discovery(args.input ?? {}, ctx.user?.id ?? null),
    searchSuggestions: (_p: unknown, args: { query: string; limit?: number | null }) =>
      searchService.suggestions(args.query, args.limit ?? 8),
  },
};
