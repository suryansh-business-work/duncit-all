import { jobApplicationService } from './jobApplication.service';
import { jobApplicationInputSchema } from './jobApplication.validator';
import { validate } from '@utils/validate';
import type { GraphQLContext } from '@context';
import { requireRole } from '@middleware/rbac';

const ADMIN_ROLES = ['SUPER_ADMIN', 'CITY_ADMIN', 'ZONAL_ADMIN', 'WEBSITE_MANAGER'];

export const jobApplicationResolvers = {
  Query: {
    jobApplications: async (_p: unknown, args: { status?: any }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_ROLES);
      return jobApplicationService.list(args.status ?? null);
    },
    jobApplicationsTable: async (_p: unknown, args: { query?: any }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_ROLES);
      return jobApplicationService.table(args.query);
    },
  },
  Mutation: {
    // Public — the careers pages submit anonymously.
    submitJobApplication: async (_p: unknown, args: { input: unknown }) => {
      const data = await validate(jobApplicationInputSchema, args.input);
      return jobApplicationService.submit(data);
    },
    updateJobApplicationStatus: async (
      _p: unknown,
      args: { application_id: string; status: any },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, ADMIN_ROLES);
      return jobApplicationService.updateStatus(args.application_id, args.status);
    },
    deleteJobApplication: async (_p: unknown, args: { application_id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_ROLES);
      return jobApplicationService.remove(args.application_id);
    },
  },
};
