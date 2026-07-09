import { GraphQLError } from 'graphql';
import { ecommBrandService } from './ecommBrand.service';
import { userService } from '@modules/access/user/user.service';
import type { GraphQLContext } from '@context';
import { requireRole } from '@middleware/rbac';
import { ADMIN_RW } from '@modules/venues/inventory/inventory.resolver';
import { InventoryProductModel } from '@modules/venues/inventory/inventory.model';

// Onboarding managers review brands; admins can too.
const BRAND_REVIEW = ['SUPER_ADMIN', 'CITY_ADMIN', 'ZONAL_ADMIN', 'ONBOARDING_MANAGER'];
// Permanent hard-delete is a developer-only action.
const DEVELOPER_DELETE = ['SUPER_ADMIN', 'DEVELOPERS_MANAGER'];

function uid(ctx: GraphQLContext) {
  if (!ctx.user) {
    throw new GraphQLError('Authentication required', { extensions: { code: 'UNAUTHENTICATED' } });
  }
  return ctx.user.id;
}

export const ecommBrandResolvers = {
  EcommBrand: {
    // .exec() returns a genuine Promise — returning the bare Mongoose Query lets
    // the GraphQL executor adopt (.then) it more than once → "Query was already
    // executed". Guard a missing id (0 products) too.
    approved_product_count: (parent: { id?: string }) => {
      if (!parent.id) return 0;
      return InventoryProductModel.countDocuments({
        brand_id: parent.id,
        ownership: 'BRAND',
        listing_review_status: 'APPROVED',
      }).exec();
    },
  },
  Query: {
    myEcommBrands: (_p: unknown, _a: unknown, ctx: GraphQLContext) =>
      ecommBrandService.listMine(uid(ctx)),
    ecommBrands: (_p: unknown, args: { status?: string }, ctx: GraphQLContext) => {
      requireRole(ctx, BRAND_REVIEW);
      return ecommBrandService.list({ status: args.status });
    },
    marketplaceBrands: (_p: unknown, args: { status?: string }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_RW);
      return ecommBrandService.list({ status: args.status ?? 'APPROVED', activeOnly: true });
    },
    ecommBrand: (_p: unknown, args: { brand_doc_id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, BRAND_REVIEW);
      return ecommBrandService.getById(args.brand_doc_id);
    },
    // Public brand card for the pod product-detail dialog — any signed-in user.
    // Clients select only non-sensitive fields (no GST/PAN/payout/commission).
    publicEcommBrand: (_p: unknown, args: { brand_doc_id: string }, ctx: GraphQLContext) => {
      uid(ctx);
      return ecommBrandService.getById(args.brand_doc_id);
    },
  },
  Mutation: {
    saveEcommBrand: (_p: unknown, args: { brand_doc_id?: string | null; input: any }, ctx: GraphQLContext) =>
      ecommBrandService.save(uid(ctx), args.brand_doc_id ?? null, args.input),
    submitEcommBrand: (_p: unknown, args: { brand_doc_id: string }, ctx: GraphQLContext) =>
      ecommBrandService.submit(uid(ctx), args.brand_doc_id),
    withdrawEcommBrand: (_p: unknown, args: { brand_doc_id: string }, ctx: GraphQLContext) =>
      ecommBrandService.withdraw(uid(ctx), args.brand_doc_id),
    approveEcommBrand: (
      _p: unknown,
      args: { brand_doc_id: string; notes?: string; tags?: string[] },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, BRAND_REVIEW);
      return ecommBrandService.approve(args.brand_doc_id, args.notes, args.tags);
    },
    rejectEcommBrand: (
      _p: unknown,
      args: { brand_doc_id: string; notes: string },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, BRAND_REVIEW);
      return ecommBrandService.reject(args.brand_doc_id, args.notes);
    },
    adminUpdateEcommBrand: (
      _p: unknown,
      args: { brand_doc_id: string; input: any; status?: string },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, BRAND_REVIEW);
      return ecommBrandService.adminUpdate(args.brand_doc_id, args.input, args.status);
    },
    setBrandCommission: (
      _p: unknown,
      args: { brand_doc_id: string; product_commission_pct: number },
      ctx: GraphQLContext
    ) => {
      // Onboarding console + finance manage the brand-level commission.
      requireRole(ctx, [...BRAND_REVIEW, 'FINANCE_MANAGER']);
      return ecommBrandService.setCommission(args.brand_doc_id, args.product_commission_pct);
    },
    setEcommBrandActive: (
      _p: unknown,
      args: { brand_doc_id: string; active: boolean },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, BRAND_REVIEW);
      return ecommBrandService.setActive(args.brand_doc_id, args.active);
    },
    deleteEcommBrand: async (
      _p: unknown,
      args: { brand_doc_id: string; email: string; password: string },
      ctx: GraphQLContext
    ) => {
      // Developer-only permanent delete, re-confirmed with the caller's own
      // email + password (this cannot be undone).
      requireRole(ctx, DEVELOPER_DELETE);
      await userService.assertPasswordConfirmation(uid(ctx), args.email, args.password);
      return ecommBrandService.deleteBrand(args.brand_doc_id);
    },
  },
};
