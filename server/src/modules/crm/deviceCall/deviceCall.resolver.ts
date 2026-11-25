import type { GraphQLContext } from '@context';
import { requireRole } from '@middleware/rbac';
import { CRM_RW } from '@modules/crm/crm/crm.constants';
import { lookupPhone, phoneDirectoryPage } from './deviceCall.lookup';
import { attachDeviceCallRecording, logDeviceCall } from './deviceCall.service';

const RW = [...CRM_RW];

export const deviceCallResolvers = {
  Query: {
    crmPhoneLookup: (_p: unknown, args: { phone: string }, ctx: GraphQLContext) => {
      requireRole(ctx, RW);
      return lookupPhone(args.phone);
    },
    crmPhoneDirectory: (_p: unknown, args: { cursor?: string | null; limit?: number | null }, ctx: GraphQLContext) => {
      requireRole(ctx, RW);
      return phoneDirectoryPage(args.cursor, args.limit);
    },
  },
  Mutation: {
    logCrmDeviceCall: (_p: unknown, args: { input: unknown }, ctx: GraphQLContext) => {
      const user = requireRole(ctx, RW);
      return logDeviceCall(args.input, user);
    },
    attachCrmDeviceCallRecording: (_p: unknown, args: { input: unknown }, ctx: GraphQLContext) => {
      const user = requireRole(ctx, RW);
      return attachDeviceCallRecording(args.input, user);
    },
  },
};
