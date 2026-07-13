import { categoryService } from './category.service';
import type { GraphQLContext } from '@context';
import { requireRole } from '@middleware/rbac';

const ADMIN_WRITE = ['SUPER_ADMIN', 'CITY_ADMIN'];

export const categoryResolvers = {
  Query: {
    categories: async (_p: unknown, args: { filter?: any }) => categoryService.list(args.filter),
    category: async (_p: unknown, args: { category_id: string }) =>
      categoryService.getById(args.category_id),
    categoryTree: async () => categoryService.tree(),
  },
  Mutation: {
    createCategory: async (_p: unknown, args: { input: any }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_WRITE);
      return categoryService.create(args.input);
    },
    updateCategory: async (
      _p: unknown,
      args: { category_id: string; input: any },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, ADMIN_WRITE);
      return categoryService.update(args.category_id, args.input);
    },
    deleteCategory: async (_p: unknown, args: { category_id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_WRITE);
      return categoryService.remove(args.category_id);
    },
  },
};
