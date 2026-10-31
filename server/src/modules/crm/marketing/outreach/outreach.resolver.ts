import type { GraphQLContext } from '@context';
import { requireRole } from '@middleware/rbac';
import type { TableQueryInput } from '@utils/table-query';
import { leadActor } from '../leads/marketingLead.service';
import { outreachService } from './outreach.service';
import { outreachWaTemplates } from './outreach.templates';
import { draftSequenceStep } from './outreach.draft';
import { OUTREACH_MANAGE, OUTREACH_READ, type OutreachLeadFilter, type OutreachSequenceInput } from './outreach.types';

type Ctx = GraphQLContext;

const isManager = (roles: readonly string[] | undefined) => (roles ?? []).some((role) => OUTREACH_MANAGE.includes(role));

export const outreachResolvers = {
  Query: {
    outreachSequences: (_p: unknown, _a: unknown, ctx: Ctx) => {
      requireRole(ctx, OUTREACH_READ);
      return outreachService.list();
    },
    outreachSequence: (_p: unknown, args: { id: string }, ctx: Ctx) => {
      requireRole(ctx, OUTREACH_READ);
      return outreachService.get(args.id);
    },
    outreachEnrollmentsTable: (_p: unknown, args: { query?: TableQueryInput | null }, ctx: Ctx) => {
      requireRole(ctx, OUTREACH_READ);
      return outreachService.enrollmentsTable(args.query);
    },
    outreachTasks: (_p: unknown, _a: unknown, ctx: Ctx) => {
      requireRole(ctx, OUTREACH_READ);
      return outreachService.tasks();
    },
    outreachWaTemplates: (_p: unknown, _a: unknown, ctx: Ctx) => {
      requireRole(ctx, OUTREACH_READ);
      return outreachWaTemplates();
    },
    outreachEnrollCount: (_p: unknown, args: { sequence_id: string; filter?: OutreachLeadFilter | null }, ctx: Ctx) => {
      requireRole(ctx, OUTREACH_MANAGE);
      return outreachService.enrollCount(args.sequence_id, args.filter);
    },
  },
  Mutation: {
    saveOutreachSequence: (_p: unknown, args: { id?: string | null; input: OutreachSequenceInput }, ctx: Ctx) => {
      const user = requireRole(ctx, OUTREACH_READ);
      return outreachService.save(args.id, args.input, user, isManager(user.roles));
    },
    setOutreachSequenceActive: (_p: unknown, args: { id: string; active: boolean }, ctx: Ctx) => {
      const user = requireRole(ctx, OUTREACH_MANAGE);
      return outreachService.setActive(args.id, args.active, user);
    },
    enrollLeads: (_p: unknown, args: { sequence_id: string; lead_ids?: string[] | null; filter?: OutreachLeadFilter | null }, ctx: Ctx) => {
      const user = requireRole(ctx, OUTREACH_MANAGE);
      return outreachService.enroll(args.sequence_id, args.lead_ids, args.filter, user);
    },
    pauseEnrollment: (_p: unknown, args: { id: string }, ctx: Ctx) => {
      requireRole(ctx, OUTREACH_MANAGE);
      return outreachService.pause(args.id);
    },
    resumeEnrollment: (_p: unknown, args: { id: string }, ctx: Ctx) => {
      requireRole(ctx, OUTREACH_MANAGE);
      return outreachService.resume(args.id);
    },
    removeEnrollment: (_p: unknown, args: { id: string }, ctx: Ctx) => {
      requireRole(ctx, OUTREACH_MANAGE);
      return outreachService.remove(args.id);
    },
    completeOutreachTask: async (_p: unknown, args: { id: string; note?: string | null }, ctx: Ctx) => {
      const user = requireRole(ctx, OUTREACH_READ);
      const actor = await leadActor(user);
      return outreachService.completeTask(args.id, args.note, { id: user.id, name: actor.name });
    },
    draftSequenceStep: (_p: unknown, args: { sequence_id: string; step_index: number; lead_id?: string | null }, ctx: Ctx) => {
      requireRole(ctx, OUTREACH_READ);
      return draftSequenceStep(args.sequence_id, args.step_index, args.lead_id);
    },
  },
};
