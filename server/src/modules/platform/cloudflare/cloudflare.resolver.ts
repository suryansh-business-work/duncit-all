import type { GraphQLContext } from '@context';
import { requireRole } from '@middleware/rbac';
import { cloudflareService } from './cloudflare.service';
import { nameServerService, type NameServerTarget } from './cloudflare.nameservers';

// The same seats that hold the GoDaddy and Cloudflare keys in Environment
// Variables. A nameserver switch decides what every *.duncit.com host resolves
// to, so nobody else reads or writes here.
const TECH_MANAGE = ['SUPER_ADMIN', 'TECH_MANAGER'];

export const cloudflareResolvers = {
  Query: {
    cloudflareMigration: (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, TECH_MANAGE);
      return cloudflareService.migration();
    },
  },
  Mutation: {
    createCloudflareZone: (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      const user = requireRole(ctx, TECH_MANAGE);
      return cloudflareService.createZone(user.id);
    },
    copyDnsToCloudflare: (_p: unknown, args: { ids: string[] }, ctx: GraphQLContext) => {
      const user = requireRole(ctx, TECH_MANAGE);
      return cloudflareService.copy(args.ids, user.id);
    },
    deleteCloudflareDnsRecord: (_p: unknown, args: { id: string }, ctx: GraphQLContext) => {
      const user = requireRole(ctx, TECH_MANAGE);
      return cloudflareService.removeRecord(args.id, user.id);
    },
    checkCloudflareActivation: (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      const user = requireRole(ctx, TECH_MANAGE);
      return cloudflareService.activationCheck(user.id);
    },
    setDomainNameServers: (
      _p: unknown,
      args: { target: NameServerTarget; name_servers?: string[] | null },
      ctx: GraphQLContext
    ) => {
      const user = requireRole(ctx, TECH_MANAGE);
      return nameServerService.set(args.target, args.name_servers, user.id);
    },
  },
};
