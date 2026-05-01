import { GraphQLError } from 'graphql';
import { FinanceSettingsModel, getFinanceSettings, type IFinanceSettings } from './finance.model';
import type { GraphQLContext } from '../../context';
import { requireRole } from '../../middleware/rbac';

const ADMIN_RW = ['SUPER_ADMIN', 'CITY_ADMIN'];

const toPub = (d: IFinanceSettings) => ({
  platform_fee_pct: d.platform_fee_pct,
  gst_pct: d.gst_pct,
  currency_symbol: d.currency_symbol,
  invoice_prefix: d.invoice_prefix,
  dummy_mode: d.dummy_mode,
  business_name: d.business_name,
  business_address: d.business_address,
  business_gstin: d.business_gstin,
  updated_at: d.updated_at.toISOString(),
});

export const financeResolvers = {
  Query: {
    financeSettings: async (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_RW);
      const doc = await getFinanceSettings();
      return toPub(doc);
    },
    publicFinanceSettings: async () => {
      const doc = await getFinanceSettings();
      return {
        platform_fee_pct: doc.platform_fee_pct,
        gst_pct: doc.gst_pct,
        currency_symbol: doc.currency_symbol,
        dummy_mode: doc.dummy_mode,
      };
    },
  },
  Mutation: {
    updateFinanceSettings: async (_p: unknown, args: { input: any }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_RW);
      const input = args.input;
      if (input.platform_fee_pct !== undefined && (input.platform_fee_pct < 0 || input.platform_fee_pct > 50))
        throw new GraphQLError('platform_fee_pct must be between 0 and 50', { extensions: { code: 'BAD_USER_INPUT' } });
      if (input.gst_pct !== undefined && (input.gst_pct < 0 || input.gst_pct > 50))
        throw new GraphQLError('gst_pct must be between 0 and 50', { extensions: { code: 'BAD_USER_INPUT' } });
      const doc = await FinanceSettingsModel.findOneAndUpdate(
        { singleton_key: 'finance' },
        { $set: input },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );
      return toPub(doc!);
    },
  },
};
