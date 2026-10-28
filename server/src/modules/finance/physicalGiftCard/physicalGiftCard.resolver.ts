import { MAX_CARDS_PER_BATCH, physicalGiftCardService } from './physicalGiftCard.service';
import { physicalBatchRows, physicalGiftCardAdminService } from './physicalGiftCard.admin.service';
import { giftCardSettingsService } from '@modules/finance/giftcard/giftcard.settings.service';
import type { GraphQLContext } from '@context';
import { LOYALTY_ADMIN_READ, LOYALTY_ADMIN_WRITE, requireAuth, requireRole } from '@middleware/rbac';
import type { TableQueryInput } from '@utils/table-query';

type TableArgs = { query?: TableQueryInput | null };

// Printed cards are coins the platform owes — the same doors as the rest of the
// Loyalty console. A passcode IS a card's value, so reading one is a write-seat
// act (and every read lands in the card's history), never the analyst's.
//
// No role gate on redeeming: every signed-in account may turn a card it holds
// into coins — the service enforces the card's own member mapping.
export const physicalGiftCardResolvers = {
  Query: {
    physicalGiftCardPolicy: async (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, LOYALTY_ADMIN_READ);
      const settings = await giftCardSettingsService.get();
      return {
        max_coins_per_card: settings.max_amount,
        max_cards_per_batch: MAX_CARDS_PER_BATCH,
        validity_months: settings.validity_months,
      };
    },
    physicalGiftCardAdminStats: async (
      _p: unknown,
      args: { months?: number | null },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, LOYALTY_ADMIN_READ);
      return physicalGiftCardAdminService.stats(args.months);
    },
    physicalGiftCardsTable: async (
      _p: unknown,
      args: TableArgs & { batch_id?: string | null },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, LOYALTY_ADMIN_READ);
      return physicalGiftCardAdminService.cardsTable(args.query, args.batch_id);
    },
    physicalGiftCardBatchesTable: async (_p: unknown, args: TableArgs, ctx: GraphQLContext) => {
      requireRole(ctx, LOYALTY_ADMIN_READ);
      return physicalGiftCardAdminService.batchesTable(args.query);
    },
    physicalGiftCardBatch: async (_p: unknown, args: { id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, LOYALTY_ADMIN_READ);
      return physicalGiftCardAdminService.batch(args.id);
    },
    physicalGiftCardEventsTable: async (_p: unknown, args: TableArgs, ctx: GraphQLContext) => {
      requireRole(ctx, LOYALTY_ADMIN_READ);
      return physicalGiftCardAdminService.eventsTable(args.query);
    },
    physicalGiftCardAdminDetail: async (_p: unknown, args: { id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, LOYALTY_ADMIN_READ);
      return physicalGiftCardAdminService.detail(args.id);
    },
    physicalGiftCardPasscode: async (_p: unknown, args: { id: string }, ctx: GraphQLContext) => {
      const actor = requireRole(ctx, LOYALTY_ADMIN_WRITE);
      return physicalGiftCardAdminService.revealPasscode(args.id, actor.id);
    },
    physicalGiftCardBatchPasscodes: async (
      _p: unknown,
      args: { batch_id: string },
      ctx: GraphQLContext
    ) => {
      const actor = requireRole(ctx, LOYALTY_ADMIN_WRITE);
      return physicalGiftCardAdminService.batchPasscodes(args.batch_id, actor.id);
    },
  },
  Mutation: {
    redeemPhysicalGiftCard: async (
      _p: unknown,
      args: { card_number: string; passcode: string },
      ctx: GraphQLContext
    ) => {
      const user = requireAuth(ctx);
      return physicalGiftCardService.redeem(args.card_number, args.passcode, user.id);
    },
    generatePhysicalGiftCards: async (
      _p: unknown,
      args: {
        input: {
          label: string;
          coins: number;
          quantity?: number | null;
          user_ids?: string[] | null;
          expires_on?: string | null;
        };
      },
      ctx: GraphQLContext
    ) => {
      const actor = requireRole(ctx, LOYALTY_ADMIN_WRITE);
      const batch = await physicalGiftCardService.generate({
        adminId: actor.id,
        label: args.input.label,
        coins: args.input.coins,
        quantity: args.input.quantity,
        userIds: args.input.user_ids,
        expiresOn: args.input.expires_on,
      });
      const [row] = await physicalBatchRows([batch]);
      return row;
    },
    voidPhysicalGiftCard: async (
      _p: unknown,
      args: { id: string; reason: string },
      ctx: GraphQLContext
    ) => {
      const actor = requireRole(ctx, LOYALTY_ADMIN_WRITE);
      const card = await physicalGiftCardService.void({
        id: args.id,
        adminId: actor.id,
        reason: args.reason,
      });
      return physicalGiftCardAdminService.cardRow(card);
    },
  },
};
