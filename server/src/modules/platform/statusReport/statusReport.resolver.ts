import type { GraphQLContext } from '@context';
import { requireRole } from '@middleware/rbac';
import { identityFromRequest } from '@observability/requestIdentity';
import { requireHuman } from '@modules/platform/captcha/captcha.guard';
import type { TableQueryInput } from '@utils/table-query';
import {
  statusReportService,
  type SubmitStatusReportInput,
} from './statusReport.service';
import type { StatusReportStatus } from './statusReport.model';

// Reports are triaged from the Tech portal, beside the telemetry.
const STATUS_REPORT_ROLES = ['SUPER_ADMIN', 'TECH_MANAGER'];

export const statusReportResolvers = {
  Query: {
    statusReportsTable: (
      _p: unknown,
      args: { query?: TableQueryInput | null },
      ctx: GraphQLContext,
    ) => {
      requireRole(ctx, STATUS_REPORT_ROLES);
      return statusReportService.table(args.query);
    },
  },
  Mutation: {
    /**
     * No `requireRole`: the status page carries no login, and the reporter we
     * most need to hear from is the one who cannot get past one. The identity
     * still comes off the REQUEST — address, user agent, and the account only
     * if that browser happens to be signed in — so the row is attributable
     * without the body being able to claim anything.
     *
     * Unauthenticated does not mean unguarded: a signed-out caller answers the
     * captcha first, so the board that exists to be honest about outages is not
     * also a mailbox anyone can flood.
     */
    submitStatusReport: (
      _p: unknown,
      args: { input: SubmitStatusReportInput },
      ctx: GraphQLContext,
    ) => {
      requireHuman(ctx, args.input);
      const identity = identityFromRequest(ctx.req);
      return statusReportService.submit(args.input, {
        ip: identity.ip ?? null,
        user_agent: identity.user_agent ?? null,
        user_id: identity.user?.id ?? null,
      });
    },
    updateStatusReport: (
      _p: unknown,
      args: {
        report_id: string;
        status: StatusReportStatus;
        note?: string | null;
        staff_images?: string[] | null;
      },
      ctx: GraphQLContext,
    ) => {
      requireRole(ctx, STATUS_REPORT_ROLES);
      return statusReportService.updateStatus(
        args.report_id,
        args.status,
        args.note,
        args.staff_images,
      );
    },
    deleteStatusReports: (_p: unknown, args: { ids: string[] }, ctx: GraphQLContext) => {
      requireRole(ctx, STATUS_REPORT_ROLES);
      return statusReportService.remove(args.ids);
    },
  },
};
