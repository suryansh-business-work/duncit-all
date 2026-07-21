import { meetingService, type MeetingFilter } from './meeting.service';
import type { SurveyKind } from './survey.model';
import type { GraphQLContext } from '@context';
import { requireAuth, requireRole } from '@middleware/rbac';

const ONBOARDING_RW = ['SUPER_ADMIN', 'ONBOARDING_MANAGER'];

export const meetingResolvers = {
  // Lazily resolve the linked onboarded record's status — only hit when a query
  // selects it (the Earn cards do; the portal table does not), so no N+1 there.
  OnboardingMeeting: {
    onboarded_status: (parent: { user_id: string; kind: SurveyKind }) =>
      meetingService.onboardedStatusFor(parent.user_id, parent.kind),
  },
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
    onboardingMeetingsTable: (_p: unknown, args: { query?: any }, ctx: GraphQLContext) => {
      requireRole(ctx, ONBOARDING_RW);
      return meetingService.table(args.query);
    },
    meetingAvailability: (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireAuth(ctx);
      return meetingService.availability();
    },
    meetingSlots: (_p: unknown, args: { kind?: SurveyKind | null; exclude_meeting_id?: string | null }, ctx: GraphQLContext) => {
      const user = requireAuth(ctx);
      return meetingService.slots(user.id, { kind: args.kind ?? null, excludeMeetingId: args.exclude_meeting_id ?? null });
    },
    meetingHolidays: (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireAuth(ctx);
      return meetingService.holidays();
    },
  },
  Mutation: {
    requestMeeting: (_p: unknown, args: { kind: SurveyKind; input: any }, ctx: GraphQLContext) => {
      const user = requireAuth(ctx);
      return meetingService.request(user.id, args.kind, args.input);
    },
    rescheduleMyMeeting: (_p: unknown, args: { kind: SurveyKind; requested_at: string; reason?: string | null }, ctx: GraphQLContext) => {
      const user = requireAuth(ctx);
      return meetingService.rescheduleMyMeeting(user.id, args.kind, args.requested_at, args.reason ?? null);
    },
    cancelMyMeeting: (_p: unknown, args: { kind: SurveyKind; reason?: string | null }, ctx: GraphQLContext) => {
      const user = requireAuth(ctx);
      return meetingService.cancelMyMeeting(user.id, args.kind, args.reason ?? null);
    },
    updateMeeting: (_p: unknown, args: { id: string; input: any }, ctx: GraphQLContext) => {
      const user = requireRole(ctx, ONBOARDING_RW);
      return meetingService.update(args.id, args.input, user.id);
    },
    cancelMeeting: (_p: unknown, args: { id: string; reason: string }, ctx: GraphQLContext) => {
      requireRole(ctx, ONBOARDING_RW);
      return meetingService.cancelByStaff(args.id, args.reason);
    },
    dismissMeeting: (_p: unknown, args: { id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, ONBOARDING_RW);
      return meetingService.dismiss(args.id);
    },
    decideMeeting: (_p: unknown, args: { id: string; decision: 'APPROVED' | 'DENIED'; feedback: string }, ctx: GraphQLContext) => {
      requireRole(ctx, ONBOARDING_RW);
      return meetingService.decide(args.id, args.decision, args.feedback);
    },
    updateMeetingAvailability: (_p: unknown, args: { input: any }, ctx: GraphQLContext) => {
      requireRole(ctx, ONBOARDING_RW);
      return meetingService.updateAvailability(args.input);
    },
    addMeetingHoliday: (_p: unknown, args: { input: any }, ctx: GraphQLContext) => {
      requireRole(ctx, ONBOARDING_RW);
      return meetingService.addHoliday(args.input);
    },
    removeMeetingHoliday: (_p: unknown, args: { id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, ONBOARDING_RW);
      return meetingService.removeHoliday(args.id);
    },
  },
};
