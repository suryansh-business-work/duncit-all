import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { FinanceSettingsModel, getFinanceSettings, type IFinanceSettings } from './finance.model';
import { paymentReleaseService } from './paymentRelease.service';
import { computePodSettlement } from './settlement.service';
import { breakdownService } from './breakdown.service';
import { isRazorpayConfigured } from '@modules/finance/payment/razorpay.gateway';
import { PodModel } from '@modules/pods/pod/pod.model';
import { UserModel } from '@modules/access/user/user.model';
import type { GraphQLContext } from '@context';
import { requireRole, requireAuth } from '@middleware/rbac';

const ADMIN_RW = ['SUPER_ADMIN', 'CITY_ADMIN', 'FINANCE_MANAGER'];
const ADMIN_POD = ['SUPER_ADMIN', 'CITY_ADMIN', 'ZONAL_ADMIN', 'FINANCE_MANAGER'];

async function assertPodActor(ctx: GraphQLContext, podId: string) {
  const user = requireAuth(ctx);
  const isAdmin = (user.roles ?? []).some((r) => ADMIN_POD.includes(r));
  const pod = await PodModel.findById(podId).select('pod_hosts_id');
  if (!pod) throw new GraphQLError('Pod not found', { extensions: { code: 'NOT_FOUND' } });
  const isHost = (pod.pod_hosts_id ?? []).some((id: any) => String(id) === user.id);
  if (!isHost && !isAdmin) {
    throw new GraphQLError('Only a host of this pod can do that', { extensions: { code: 'FORBIDDEN' } });
  }
  return { user, isAdmin };
}

const toPub = (d: IFinanceSettings) => ({
  platform_fee_pct: d.platform_fee_pct,
  gst_pct: d.gst_pct,
  default_host_share_pct: d.default_host_share_pct,
  default_host_commission_pct: d.default_host_commission_pct,
  default_venue_share_pct: d.default_venue_share_pct,
  default_venue_commission_pct: d.default_venue_commission_pct,
  default_product_commission_pct: d.default_product_commission_pct,
  default_backout_deduction_pct: d.default_backout_deduction_pct,
  venue_payout_mode: d.venue_payout_mode,
  host_payout_mode: d.host_payout_mode,
  payout_day_of_week: d.payout_day_of_week,
  payout_time: d.payout_time,
  currency_symbol: d.currency_symbol,
  invoice_prefix: d.invoice_prefix,
  dummy_mode: d.dummy_mode,
  business_name: d.business_name,
  business_address: d.business_address,
  business_gstin: d.business_gstin,
  invoice_label: d.invoice_label,
  invoice_support_email: d.invoice_support_email,
  invoice_support_phone: d.invoice_support_phone,
  invoice_footer_note: d.invoice_footer_note,
  invoice_terms: d.invoice_terms,
  invoice_logo_url: d.invoice_logo_url,
  invoice_templates: {
    venue: { ...d.invoice_templates.venue },
    host: { ...d.invoice_templates.host },
    product: { ...d.invoice_templates.product },
  },
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
        razorpay_enabled: await isRazorpayConfigured(),
      };
    },
    paymentReleaseRequests: async (_p: unknown, args: { filter?: any }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_RW);
      return paymentReleaseService.list(args.filter);
    },
    podSettlementPreview: async (
      _p: unknown,
      args: { pod_id: string; venue_bill_amount: number },
      ctx: GraphQLContext
    ) => {
      await assertPodActor(ctx, args.pod_id);
      return computePodSettlement(args.pod_id, args.venue_bill_amount);
    },
    myHostPayouts: async (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      const user = requireAuth(ctx);
      return paymentReleaseService.listMine(user.id);
    },
    myVenuePayouts: async (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      const user = requireAuth(ctx);
      return paymentReleaseService.listMineVenue(user.id);
    },
    podFinanceBreakdown: async (_p: unknown, args: { pod_id: string }, ctx: GraphQLContext) => {
      const user = requireAuth(ctx);
      const isAdmin = (user.roles ?? []).some((r) => ADMIN_POD.includes(r));
      if (!isAdmin && !(await breakdownService.canViewPodBreakdown(args.pod_id, user.id))) {
        throw new GraphQLError('Only this pod’s host, venue owner, or an admin can view its breakdown', {
          extensions: { code: 'FORBIDDEN' },
        });
      }
      return breakdownService.podFinanceBreakdown(args.pod_id);
    },
    potentialPodEarnings: async (
      _p: unknown,
      args: { amount: number; venue_id?: string | null; venue_amount?: number | null },
      ctx: GraphQLContext
    ) => {
      const user = requireAuth(ctx);
      return breakdownService.potentialPodEarnings(
        user.id,
        args.amount,
        args.venue_id ?? null,
        args.venue_amount ?? null
      );
    },
    myHostEarningsSummary: async (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      const user = requireAuth(ctx);
      return breakdownService.hostEarningsSummary(user.id);
    },
    myVenueEarningsSummary: async (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      const user = requireAuth(ctx);
      return breakdownService.venueEarningsSummary(user.id);
    },
    financeDashboardStats: async (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_RW);
      return breakdownService.dashboardStats();
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
      const pctFields = [
        'default_host_share_pct',
        'default_host_commission_pct',
        'default_venue_share_pct',
        'default_venue_commission_pct',
        'default_product_commission_pct',
        'default_backout_deduction_pct',
      ];
      for (const field of pctFields) {
        const value = input[field];
        if (value !== undefined && (value < 0 || value > 100)) {
          throw new GraphQLError(`${field} must be between 0 and 100`, { extensions: { code: 'BAD_USER_INPUT' } });
        }
      }
      if (
        input.payout_day_of_week !== undefined &&
        (input.payout_day_of_week < 0 || input.payout_day_of_week > 6)
      ) {
        throw new GraphQLError('payout_day_of_week must be between 0 and 6', { extensions: { code: 'BAD_USER_INPUT' } });
      }
      if (input.payout_time !== undefined && !/^([01]\d|2[0-3]):[0-5]\d$/.test(input.payout_time)) {
        throw new GraphQLError('payout_time must be in HH:mm format', { extensions: { code: 'BAD_USER_INPUT' } });
      }
      // Flatten nested invoice templates to dotted paths so a partial update of
      // one party's template doesn't wipe the others.
      const set: Record<string, any> = { ...input };
      if (input.invoice_templates) {
        delete set.invoice_templates;
        for (const kind of ['venue', 'host', 'product']) {
          if (input.invoice_templates[kind]) set[`invoice_templates.${kind}`] = input.invoice_templates[kind];
        }
      }
      const doc = await FinanceSettingsModel.findOneAndUpdate(
        { singleton_key: 'finance' },
        { $set: set },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );
      return toPub(doc!);
    },
    createPaymentReleaseRequest: async (_p: unknown, args: { input: any }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_POD);
      return paymentReleaseService.create(args.input, ctx.user?.id ?? null);
    },
    reviewPaymentReleaseRequest: async (_p: unknown, args: { request_id: string; input: any }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_RW);
      return paymentReleaseService.review(args.request_id, args.input, ctx.user?.id ?? null);
    },
    completePodSettlement: async (_p: unknown, args: { input: any }, ctx: GraphQLContext) => {
      const { user, isAdmin } = await assertPodActor(ctx, args.input.pod_id);
      return paymentReleaseService.completePod(args.input, { id: user.id, isAdmin });
    },
    setHostDeductions: async (
      _p: unknown,
      args: { user_id: string; host_commission_pct: number },
      ctx: GraphQLContext
    ) => {
      // Finance + the Onboarding console (Onboarded Hosts) manage host commission.
      requireRole(ctx, [...ADMIN_RW, 'ONBOARDING_MANAGER']);
      if (!Types.ObjectId.isValid(args.user_id)) {
        throw new GraphQLError('Invalid user', { extensions: { code: 'BAD_USER_INPUT' } });
      }
      if (
        !Number.isFinite(args.host_commission_pct) ||
        args.host_commission_pct < 0 ||
        args.host_commission_pct > 100
      ) {
        throw new GraphQLError('host_commission_pct must be between 0 and 100', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }
      const updated = await UserModel.findByIdAndUpdate(args.user_id, {
        $set: { 'finance.host_commission_pct': args.host_commission_pct },
      });
      if (!updated) throw new GraphQLError('User not found', { extensions: { code: 'NOT_FOUND' } });
      return true;
    },
  },
};
