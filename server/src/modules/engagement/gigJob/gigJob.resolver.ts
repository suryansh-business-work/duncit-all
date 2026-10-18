import type { GraphQLContext } from '@context';
import { requireAuth, requireRole } from '@middleware/rbac';
import type { TableQueryInput } from '@utils/table-query';
import type { GigJobStatus } from './gigJob.model';
import { gigCategoryService } from './gigCategory.service';
import { gigJobService, type GigJobFilter } from './gigJob.service';
import { freelancerService } from './freelancer.service';
import { gigAdminService } from './gigAdmin.service';

/** The Gig Jobs console's seats (gig-jobs.duncit.com): categories, moderation, the tables. */
const GIG_ADMIN = ['SUPER_ADMIN', 'GIG_JOBS_MANAGER'];

type Page = { offset?: number | null; limit?: number | null };

export const gigJobResolvers = {
  Query: {
    gigCategories: (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireAuth(ctx);
      return gigCategoryService.listActive();
    },
    gigJobs: (_p: unknown, args: Page & { filter?: GigJobFilter }, ctx: GraphQLContext) =>
      gigJobService.board(requireAuth(ctx).id, args.filter, args.offset, args.limit),
    gigJob: (_p: unknown, args: { id: string }, ctx: GraphQLContext) => gigJobService.get(requireAuth(ctx).id, args.id),
    myGigJobs: (_p: unknown, args: Page, ctx: GraphQLContext) =>
      gigJobService.mine(requireAuth(ctx).id, args.offset, args.limit),
    gigJobInterests: (_p: unknown, args: { job_id: string }, ctx: GraphQLContext) =>
      gigJobService.interests(requireAuth(ctx).id, args.job_id),
    gigViewer: (_p: unknown, _a: unknown, ctx: GraphQLContext) => gigJobService.viewer(requireAuth(ctx).id),
    myFreelancerProfile: (_p: unknown, _a: unknown, ctx: GraphQLContext) => freelancerService.mine(requireAuth(ctx).id),
    gigCategoriesTable: (_p: unknown, args: { query?: TableQueryInput }, ctx: GraphQLContext) => {
      requireRole(ctx, GIG_ADMIN);
      return gigCategoryService.table(args.query);
    },
    gigJobStats: (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, GIG_ADMIN);
      return gigAdminService.stats();
    },
    gigJobsAdminTable: (_p: unknown, args: { query?: TableQueryInput }, ctx: GraphQLContext) => {
      requireRole(ctx, GIG_ADMIN);
      return gigAdminService.jobsTable(args.query);
    },
    freelancersAdminTable: (_p: unknown, args: { query?: TableQueryInput }, ctx: GraphQLContext) => {
      requireRole(ctx, GIG_ADMIN);
      return gigAdminService.freelancersTable(args.query);
    },
    gigInterestsAdminTable: (
      _p: unknown,
      args: { query?: TableQueryInput; job_id?: string | null },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, GIG_ADMIN);
      return gigAdminService.interestsTable(args.query, args.job_id);
    },
  },
  Mutation: {
    createGigJob: (_p: unknown, args: { input: unknown }, ctx: GraphQLContext) =>
      gigJobService.create(requireAuth(ctx).id, args.input),
    updateGigJob: (_p: unknown, args: { id: string; input: unknown }, ctx: GraphQLContext) =>
      gigJobService.update(requireAuth(ctx).id, args.id, args.input),
    setGigJobStatus: (_p: unknown, args: { id: string; status: GigJobStatus }, ctx: GraphQLContext) =>
      gigJobService.setStatus(requireAuth(ctx).id, args.id, args.status),
    expressGigInterest: (_p: unknown, args: { job_id: string; message?: string | null }, ctx: GraphQLContext) =>
      gigJobService.expressInterest(requireAuth(ctx).id, args.job_id, { message: args.message ?? '' }),
    saveFreelancerProfile: (_p: unknown, args: { input: unknown }, ctx: GraphQLContext) =>
      freelancerService.save(requireAuth(ctx).id, args.input),
    createGigCategory: (_p: unknown, args: { input: unknown }, ctx: GraphQLContext) => {
      requireRole(ctx, GIG_ADMIN);
      return gigCategoryService.create(args.input);
    },
    updateGigCategory: (_p: unknown, args: { id: string; input: unknown }, ctx: GraphQLContext) => {
      requireRole(ctx, GIG_ADMIN);
      return gigCategoryService.update(args.id, args.input);
    },
    deleteGigCategory: (_p: unknown, args: { id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, GIG_ADMIN);
      return gigCategoryService.remove(args.id);
    },
    adminSetGigJobStatus: (_p: unknown, args: { id: string; status: GigJobStatus }, ctx: GraphQLContext) =>
      gigAdminService.setStatus(requireRole(ctx, GIG_ADMIN).id, args.id, args.status),
    adminDeleteGigJob: (_p: unknown, args: { id: string }, ctx: GraphQLContext) =>
      gigAdminService.remove(requireRole(ctx, GIG_ADMIN).id, args.id),
  },
};
