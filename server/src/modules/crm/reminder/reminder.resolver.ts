import { reminderService, type ReminderFilter } from './reminder.service';
import { CRM_RW } from '@modules/crm/crm/crm.constants';
import type { GraphQLContext } from '@context';
import { requireRole } from '@middleware/rbac';

const RW = [...CRM_RW];

export const reminderResolvers = {
  Query: {
    crmReminders: (_p: unknown, args: { filter?: ReminderFilter | null }, ctx: GraphQLContext) => {
      requireRole(ctx, RW);
      return reminderService.list(args.filter ?? {});
    },
  },
  Mutation: {
    createCrmReminder: (_p: unknown, args: { input: any }, ctx: GraphQLContext) => {
      const user = requireRole(ctx, RW);
      return reminderService.create(args.input, user.id);
    },
    updateCrmReminder: (_p: unknown, args: { id: string; input: any }, ctx: GraphQLContext) => {
      requireRole(ctx, RW);
      return reminderService.update(args.id, args.input);
    },
    toggleCrmReminderDone: (_p: unknown, args: { id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, RW);
      return reminderService.toggleDone(args.id);
    },
    deleteCrmReminder: (_p: unknown, args: { id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, RW);
      return reminderService.remove(args.id);
    },
  },
};
