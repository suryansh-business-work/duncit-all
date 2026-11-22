import gql from 'graphql-tag';
import { logs } from '@observability/log';
import { executeAsUser } from '@utils/execute-as-user';
import { AskDuncitActionModel } from '../actions/askDuncitAction.model';
import { expireStale } from '../actions/askDuncit.actions';
import type { TurnContext } from '../turn/askDuncit.context';

/**
 * Proactive alerts shown above the conversation ("Your account health is in
 * the red", "2 changes waiting for your approval"). Each provider reads as the
 * person — through Apollo, so the resolver decides what they may see — and
 * returns a code plus parameters; the app renders the words in the person's
 * language and the suggested follow-up prompt is a localization key too.
 *
 * A provider that fails is skipped and logged; alerts never block the chat.
 */

export interface AskDuncitAlert {
  id: string;
  kind: string;
  severity: 'INFO' | 'WARN' | 'CRITICAL';
  /** Localization key of the alert text; `params` fill its {placeholders}. */
  label_key: string;
  params: string;
  /** Localization key of the message the alert's button sends. */
  prompt_key: string;
}

type Provider = (ctx: TurnContext) => Promise<AskDuncitAlert[]>;

const HEALTH = gql`
  query AskDuncitInsightHealth {
    myAccountHealth {
      total_score
      band
    }
  }
`;

const accountHealth: Provider = async (ctx) => {
  const { data } = await executeAsUser(ctx.session.caller, { document: HEALTH });
  const health = data?.myAccountHealth as { total_score?: number; band?: string } | undefined;
  if (!health || health.band === 'GREEN') return [];
  return [
    {
      id: 'account-health',
      kind: 'ACCOUNT_HEALTH',
      severity: health.band === 'RED' ? 'CRITICAL' : 'WARN',
      label_key: health.band === 'RED' ? 'askDuncit.alerts.healthRed' : 'askDuncit.alerts.healthYellow',
      params: JSON.stringify({ score: health.total_score ?? 0 }),
      prompt_key: 'askDuncit.suggestions.accountHealth',
    },
  ];
};

const pendingApprovals: Provider = async (ctx) => {
  await expireStale(ctx.user.id);
  const count = await AskDuncitActionModel.countDocuments({ user_id: ctx.user.id, status: 'PENDING' });
  if (!count) return [];
  return [
    {
      id: 'pending-approvals',
      kind: 'PENDING_APPROVALS',
      severity: 'INFO',
      label_key: 'askDuncit.alerts.pendingApprovals',
      params: JSON.stringify({ count }),
      prompt_key: 'askDuncit.suggestions.pendingApprovals',
    },
  ];
};

const PROVIDERS: readonly Provider[] = [accountHealth, pendingApprovals];

export async function proactiveAlerts(ctx: TurnContext): Promise<AskDuncitAlert[]> {
  if (!ctx.settings.features.proactive_alerts) return [];
  const results = await Promise.allSettled(PROVIDERS.map((provider) => provider(ctx)));
  return results.flatMap((result) => {
    if (result.status === 'fulfilled') return result.value;
    logs.server.warn('askDuncit', 'insight', { error: result.reason, user_id: ctx.user.id });
    return [];
  });
}
