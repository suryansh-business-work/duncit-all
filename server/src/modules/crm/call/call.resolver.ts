import { GraphQLError } from 'graphql';
import type { GraphQLContext } from '@context';
import { hasRole, requireRole } from '@middleware/rbac';
import { CRM_RW } from '@modules/crm/crm/crm.constants';
import { communicationLogService } from '@modules/crm/communicationLog/communicationLog.service';
import { callMediaSettings, missingTwilioFields, resolveAgentNumber } from './call.config';
import { controlCall, CALL_ACTIONS, type CallAction } from './call.conference';
import { getRuntimeEnvValue } from '@config/runtimeEnv';

/** Who may edit the TWILIO entry — the Tech portal's own environment managers. */
const TWILIO_CONFIGURERS = ['SUPER_ADMIN', 'TECH_MANAGER'];

export const crmCallResolvers = {
  Query: {
    crmCallSetup: async (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      const user = requireRole(ctx, CRM_RW);
      const [missing, from, agent, media] = await Promise.all([
        missingTwilioFields(),
        getRuntimeEnvValue('TWILIO_PHONE_NUMBER'),
        resolveAgentNumber(user.id),
        callMediaSettings(),
      ]);
      return {
        configured: missing.length === 0,
        missing,
        from_number: from.trim() || null,
        agent_number: agent?.number ?? null,
        agent_source: agent?.source ?? null,
        recording_enabled: media.record,
        live_transcription: media.liveTranscription,
        can_configure: hasRole(user, TWILIO_CONFIGURERS),
      };
    },
    myActiveCrmCall: async (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      const user = requireRole(ctx, CRM_RW);
      return communicationLogService.activeCallFor(user.id);
    },
  },
  Mutation: {
    controlCrmCall: async (_p: unknown, args: { log_id: string; action: CallAction }, ctx: GraphQLContext) => {
      const user = requireRole(ctx, CRM_RW);
      if (!CALL_ACTIONS.includes(args.action)) {
        throw new GraphQLError('Unknown call action', { extensions: { code: 'BAD_USER_INPUT' } });
      }
      const log = await communicationLogService.get(args.log_id).catch(() => null);
      if (log?.type !== 'CALL') throw new GraphQLError('Call not found', { extensions: { code: 'NOT_FOUND' } });
      // Driving someone else's live call (muting them, hanging up their lead) is refused server-side.
      if (log.created_by !== user.id && !hasRole(user, ['SUPER_ADMIN'])) {
        throw new GraphQLError('Only the agent who placed this call can control it', { extensions: { code: 'FORBIDDEN' } });
      }
      return controlCall(args.log_id, args.action);
    },
  },
};
