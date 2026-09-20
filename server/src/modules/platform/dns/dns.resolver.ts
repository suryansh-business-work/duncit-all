import type { GraphQLContext } from '@context';
import { requireRole } from '@middleware/rbac';
import { dnsService, type DnsRecordInput, type DnsRecordRef } from './dns.service';
import { dnsStagingService } from './dns.staging';

// The same seats that hold the GoDaddy key in Environment Variables. A record
// here can point every *.duncit.com host somewhere else, so nobody else writes.
const TECH_MANAGE = ['SUPER_ADMIN', 'TECH_MANAGER'];

export const dnsResolvers = {
  Query: {
    dnsZone: (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, TECH_MANAGE);
      return dnsService.zone();
    },
    dnsDomainInfo: (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, TECH_MANAGE);
      return dnsService.domain();
    },
  },
  Mutation: {
    addDnsRecord: (_p: unknown, args: { input: DnsRecordInput }, ctx: GraphQLContext) => {
      const user = requireRole(ctx, TECH_MANAGE);
      return dnsService.add(args.input, user.id);
    },
    updateDnsRecord: (_p: unknown, args: { ref: DnsRecordRef; input: DnsRecordInput }, ctx: GraphQLContext) => {
      const user = requireRole(ctx, TECH_MANAGE);
      return dnsService.update(args.ref, args.input, user.id);
    },
    deleteDnsRecord: (_p: unknown, args: { ref: DnsRecordRef }, ctx: GraphQLContext) => {
      const user = requireRole(ctx, TECH_MANAGE);
      return dnsService.remove(args.ref, user.id);
    },
    syncStagingDns: (_p: unknown, args: { ids: string[] }, ctx: GraphQLContext) => {
      const user = requireRole(ctx, TECH_MANAGE);
      return dnsStagingService.sync(args.ids, user.id);
    },
  },
};
