import type { GraphQLContext } from '@context';
import { requireRole } from '@middleware/rbac';
import type { AutomationChannel, AutomationFlowStatus, AutomationRunMode } from './automation.model';
import { automationOptions } from './automation.options';
import {
  automationService,
  toPubFlow,
  toPubRun,
  type ContactInput,
  type SaveFlowInput,
  type TestInput,
  type TestReplyInput,
} from './automation.service';

/** The AI portal owns automation. Nothing here is read by another console. */
const AUTOMATION_ROLES = ['SUPER_ADMIN', 'AI_MANAGER'];

const actorOf = (ctx: GraphQLContext) => requireRole(ctx, AUTOMATION_ROLES).email ?? '';

export const automationResolvers = {
  Query: {
    automationFlows: async (_p: unknown, args: { channel: AutomationChannel }, ctx: GraphQLContext) => {
      requireRole(ctx, AUTOMATION_ROLES);
      return (await automationService.list(args.channel)).map(toPubFlow);
    },
    automationFlow: async (_p: unknown, args: { id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, AUTOMATION_ROLES);
      const doc = await automationService.get(args.id);
      return doc ? toPubFlow(doc) : null;
    },
    automationOptions: (_p: unknown, args: { channel: AutomationChannel }, ctx: GraphQLContext) => {
      requireRole(ctx, AUTOMATION_ROLES);
      return automationOptions(args.channel);
    },
    automationRuns: async (
      _p: unknown,
      args: { flow_id: string; mode?: AutomationRunMode | null; limit?: number | null },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, AUTOMATION_ROLES);
      return (await automationService.runs(args.flow_id, args.mode, args.limit)).map(toPubRun);
    },
    automationRun: async (_p: unknown, args: { id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, AUTOMATION_ROLES);
      const doc = await automationService.run(args.id);
      return doc ? toPubRun(doc) : null;
    },
  },
  Mutation: {
    saveAutomationFlow: async (_p: unknown, args: { input: SaveFlowInput }, ctx: GraphQLContext) =>
      toPubFlow(await automationService.save(args.input, actorOf(ctx))),
    setAutomationFlowStatus: async (
      _p: unknown,
      args: { id: string; status: AutomationFlowStatus },
      ctx: GraphQLContext
    ) => toPubFlow(await automationService.setStatus(args.id, args.status, actorOf(ctx))),
    deleteAutomationFlow: (_p: unknown, args: { id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, AUTOMATION_ROLES);
      return automationService.remove(args.id);
    },
    duplicateAutomationFlow: async (_p: unknown, args: { id: string }, ctx: GraphQLContext) =>
      toPubFlow(await automationService.duplicate(args.id, actorOf(ctx))),
    startAutomationTest: async (_p: unknown, args: { input: TestInput }, ctx: GraphQLContext) => {
      requireRole(ctx, AUTOMATION_ROLES);
      return toPubRun(await automationService.startTest(args.input));
    },
    resumeAutomationTest: async (_p: unknown, args: { input: TestReplyInput }, ctx: GraphQLContext) => {
      requireRole(ctx, AUTOMATION_ROLES);
      return toPubRun(await automationService.resumeTest(args.input));
    },
    startAutomationRun: async (
      _p: unknown,
      args: { flow_id: string; contact: ContactInput; text?: string | null },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, AUTOMATION_ROLES);
      return toPubRun(await automationService.startLive(args.flow_id, args.contact, args.text));
    },
    cancelAutomationRun: async (_p: unknown, args: { id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, AUTOMATION_ROLES);
      return toPubRun(await automationService.cancel(args.id));
    },
  },
};
