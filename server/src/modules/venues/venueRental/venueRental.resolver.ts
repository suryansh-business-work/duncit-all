import type { GraphQLContext } from '@context';
import { FINANCE_READER, requireRole } from '@middleware/rbac';
import { logs } from '@observability/log';
import { assertPlatformFinanceWrite } from '@modules/finance/financeScope';
import { rentalSettingsService, type RentalSettingsInput } from './rentalSettings.service';

// The same seats that read and write Finance's own settings.
const FINANCE_WRITE = ['SUPER_ADMIN', 'CITY_ADMIN', 'FINANCE_MANAGER'];
const FINANCE_READ = [...FINANCE_WRITE, FINANCE_READER];

export const venueRentalResolvers = {
  Query: {
    rentalSettings: async (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, FINANCE_READ);
      return rentalSettingsService.get();
    },
    publicRentalSettings: async () => {
      const s = await rentalSettingsService.get();
      return {
        enabled: s.enabled,
        terms_html: s.terms_html,
        rent_refundable_on_backout: s.rent_refundable_on_backout,
        deposit_refundable: s.deposit_refundable,
        booking_cutoff_hours: s.booking_cutoff_hours,
      };
    },
  },
  Mutation: {
    updateRentalSettings: async (_p: unknown, args: { input: RentalSettingsInput }, ctx: GraphQLContext) => {
      const user = requireRole(ctx, FINANCE_WRITE);
      // The commission and refund rules apply to every city at once.
      assertPlatformFinanceWrite(ctx, FINANCE_WRITE);
      const before = await rentalSettingsService.get();
      const after = await rentalSettingsService.update(args.input);
      // A money rule changed: who, and from what to what, for Finance's record.
      logs.server.info('rentalSettings', 'update', {
        actor_user_id: user.id,
        before: { ...before, terms_html: `${before.terms_html.length} chars` },
        after: { ...after, terms_html: `${after.terms_html.length} chars` },
      });
      return after;
    },
  },
};
