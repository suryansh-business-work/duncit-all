import { sliderService } from './slider.service';
import type { GraphQLContext } from '@context';
import { requireRole } from '@middleware/rbac';

const ADMIN_WRITE = ['SUPER_ADMIN', 'CITY_ADMIN'];

export const sliderResolvers = {
  Query: {
    sliders: async (_p: unknown, args: { filter?: any }) => sliderService.list(args.filter),
    slider: async (_p: unknown, args: { slider_doc_id: string }) =>
      sliderService.getById(args.slider_doc_id),
  },
  Mutation: {
    createSlider: async (_p: unknown, args: { input: any }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_WRITE);
      return sliderService.create(args.input);
    },
    updateSlider: async (
      _p: unknown,
      args: { slider_doc_id: string; input: any },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, ADMIN_WRITE);
      return sliderService.update(args.slider_doc_id, args.input);
    },
    deleteSlider: async (
      _p: unknown,
      args: { slider_doc_id: string },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, ADMIN_WRITE);
      return sliderService.remove(args.slider_doc_id);
    },
  },
};
