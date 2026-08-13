import { giftcardService } from './giftcard.service';
import { giftCardAdminService } from './giftcard.admin.service';
import { giftCardSettingsService } from './giftcard.settings.service';
import type { GraphQLContext } from '@context';
import { requireAuth, requireRole } from '@middleware/rbac';
import type { TableQueryInput } from '@utils/table-query';

// Gift card liability is a platform-wide money figure — same read triple as the
// coin console. Writing policy (amounts, validity) is the narrower door.
const GIFT_CARD_ADMIN_READ = ['SUPER_ADMIN', 'CITY_ADMIN', 'FINANCE_MANAGER'];
const GIFT_CARD_ADMIN_WRITE = ['SUPER_ADMIN', 'FINANCE_MANAGER'];

// No role gate on the buyer-facing queries: every signed-in account may buy,
// hold and redeem a gift card — partners included.
export const giftCardResolvers = {
  Query: {
    publicGiftCardSettings: async (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireAuth(ctx);
      return giftCardSettingsService.pub();
    },
    myGiftCards: async (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      const user = requireAuth(ctx);
      return giftcardService.myGiftCards(user.id);
    },
    giftCardByCode: async (_p: unknown, args: { code: string }, ctx: GraphQLContext) => {
      requireAuth(ctx);
      return giftcardService.byCode(args.code);
    },
    giftCardAdminStats: async (
      _p: unknown,
      args: { months?: number | null },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, GIFT_CARD_ADMIN_READ);
      return giftCardAdminService.stats(args.months);
    },
    giftCardsTable: async (
      _p: unknown,
      args: { query?: TableQueryInput | null },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, GIFT_CARD_ADMIN_READ);
      return giftCardAdminService.cardsTable(args.query);
    },
    giftCardTransactionsTable: async (
      _p: unknown,
      args: { query?: TableQueryInput | null },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, GIFT_CARD_ADMIN_READ);
      return giftCardAdminService.transactionsTable(args.query);
    },
  },
  Mutation: {
    redeemGiftCard: async (_p: unknown, args: { code: string }, ctx: GraphQLContext) => {
      const user = requireAuth(ctx);
      return giftcardService.redeemToCoins(args.code, user.id);
    },
    updateGiftCardSettings: async (
      _p: unknown,
      args: {
        input: {
          denominations?: number[] | null;
          min_amount?: number | null;
          max_amount?: number | null;
          validity_months?: number | null;
        };
      },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, GIFT_CARD_ADMIN_WRITE);
      return giftCardSettingsService.update(args.input);
    },
  },
};
