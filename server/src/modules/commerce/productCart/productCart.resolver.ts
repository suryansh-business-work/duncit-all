import type { GraphQLContext } from '@context';
import { requireAuth, requireRole } from '@middleware/rbac';
import { productCartService, type ProductCartLineInput } from './productCart.service';
import { productCartSettingsService, type ProductCartSettingsInput } from './productCart.settings';

// Cart Settings live in the Products portal (plus platform admins).
const SETTINGS_WRITE = ['SUPER_ADMIN', 'PRODUCTS_MANAGER', 'TECH_MANAGER'];

export const productCartResolvers = {
  Query: {
    productCartSettings: () => productCartSettingsService.pub(),
  },
  Mutation: {
    updateProductCartSettings: (
      _p: unknown,
      args: { input: ProductCartSettingsInput },
      ctx: GraphQLContext
    ) => {
      const user = requireRole(ctx, SETTINGS_WRITE);
      return productCartSettingsService.update(args.input ?? {}, String(user.id));
    },
    syncMyProductCart: (
      _p: unknown,
      args: { lines: ProductCartLineInput[] },
      ctx: GraphQLContext
    ) => {
      const user = requireAuth(ctx);
      return productCartService.syncMine(String(user.id), args.lines);
    },
  },
};
