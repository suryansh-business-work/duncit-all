import { attendanceService } from './attendance.service';
import { requireAuth } from '@middleware/rbac';
import type { GraphQLContext } from '@context';

/** The signed-in person as the attendance service expects them. */
const actorOf = (ctx: GraphQLContext) => {
  const u = requireAuth(ctx);
  return { id: u.id, roles: u.roles ?? [] };
};

/**
 * No `requireRole` anywhere here on purpose.
 *
 * Both audiences are relationships, not roles: the pod's host is named on the
 * pod, and CLUB_ADMIN is a membership of a club. The service resolves which of
 * the two the caller is (and refuses everyone else) before it reads a thing.
 */
export const podAttendanceResolvers = {
  Query: {
    podAttendanceBoard: (_p: unknown, args: { pod_doc_id: string }, ctx: GraphQLContext) =>
      attendanceService.board(args.pod_doc_id, actorOf(ctx)),
  },
  Mutation: {
    requestPodAttendanceOtp: (_p: unknown, args: { input: any }, ctx: GraphQLContext) =>
      attendanceService.requestOtp(args.input, actorOf(ctx)),

    verifyPodAttendanceOtp: (
      _p: unknown,
      args: { challenge_id: string; otp: string },
      ctx: GraphQLContext
    ) => {
      // Authenticated, but not pod-scoped: the challenge itself carries the pod
      // and the booking, and spending it (`hostMark`) re-checks both.
      requireAuth(ctx);
      return attendanceService.verifyOtp(args.challenge_id, args.otp);
    },

    hostMarkPodAttendance: (
      _p: unknown,
      args: { pod_doc_id: string; membership_id: string; otp_challenge_id?: string | null },
      ctx: GraphQLContext
    ) =>
      attendanceService.hostMark(
        args.pod_doc_id,
        args.membership_id,
        args.otp_challenge_id,
        actorOf(ctx)
      ),
  },
};
