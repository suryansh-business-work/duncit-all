import { meetingService, type MeetingFilter } from './meeting.service';
import type { SurveyKind } from './survey.model';
import type { GraphQLContext } from '@context';
import { requireAuth, requireRole } from '@middleware/rbac';

const ONBOARDING_RW = ['SUPER_ADMIN', 'ONBOARDING_MANAGER'];

export const meetingResolvers = {
  Query: {
    myMeeting: (_p: unknown, args: { kind: SurveyKind }, ctx: GraphQLContext) => {
      const user = requireAuth(ctx);
      return meetingService.myMeeting(user.id, args.kind);
    },
    myMeetings: (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      const user = requireAuth(ctx);
      return meetingService.myMeetings(user.id);
    },
    onboardingMeetings: (_p: unknown, args: { filter?: MeetingFilter | null }, ctx: GraphQLContext) => {
      requireRole(ctx, ONBOARDING_RW);
      return meetingService.list(args.filter ?? {});
    },
    meetingAvailability: (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireAuth(ctx);
      return meetingService.availability();
    },
    meetingSlots: (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      const user = requireAuth(ctx);
      return meetingService.slots(user.id);
    },
  },
  Mutation: {
    requestMeeting: (_p: unknown, args: { kind: SurveyKind; input: any }, ctx: GraphQLContext) => {
      const user = requireAuth(ctx);
      return meetingService.request(user.id, args.kind, args.input);
    },
    rescheduleMyMeeting: (_p: unknown, args: { kind: SurveyKind; requested_at: string }, ctx: GraphQLContext) => {
      const user = requireAuth(ctx);
      return meetingService.rescheduleMyMeeting(user.id, args.kind, args.requested_at);
    },
    cancelMyMeeting: (_p: unknown, args: { kind: SurveyKind }, ctx: GraphQLContext) => {
      const user = requireAuth(ctx);
      return meetingService.cancelMyMeeting(user.id, args.kind);
    },
    updateMeeting: (_p: unknown, args: { id: string; input: any }, ctx: GraphQLContext) => {
      const user = requireRole(ctx, ONBOARDING_RW);
      return meetingService.update(args.id, args.input, user.id);
    },
    cancelMeeting: (_p: unknown, args: { id: string; reason: string }, ctx: GraphQLContext) => {
      requireRole(ctx, ONBOARDING_RW);
      return meetingService.cancelByStaff(args.id, args.reason);
    },
    updateMeetingAvailability: (_p: unknown, args: { input: any }, ctx: GraphQLContext) => {
      requireRole(ctx, ONBOARDING_RW);
      return meetingService.updateAvailability(args.input);
    },
  },
};
