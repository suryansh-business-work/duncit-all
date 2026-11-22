import { proactiveAlerts } from '../insights/askDuncit.insights';
import { askDuncitQuota } from '../quota/askDuncit.quota';
import type { AskDuncitSuggestion } from '../settings/askDuncitSettings.types';
import { unavailableReason, type TurnContext } from '../turn/askDuncit.context';

/**
 * What the app needs before the first message: is the assistant available to
 * this person, in which role, with which features, suggestions and alerts.
 * Every value comes from the server so the menu, the composer and the bubbles
 * change with a portal setting — no app release.
 */

/** Bubbles for this page: general ones plus those for the entity on screen. */
export function suggestionsFor(all: readonly AskDuncitSuggestion[], entityType: string, limit = 6): AskDuncitSuggestion[] {
  const onPage = all.filter((s) => s.context && s.context === entityType);
  const general = all.filter((s) => !s.context);
  return [...onPage, ...general].slice(0, limit);
}

export async function bootstrap(ctx: TurnContext) {
  const reason = unavailableReason(ctx.settings, ctx.policy, ctx.flagEnabled);
  const { features } = ctx.settings;
  const [alerts, quota] = await Promise.all([reason ? [] : proactiveAlerts(ctx), askDuncitQuota.snapshot(ctx.user.id, ctx.policy)]);
  return {
    available: reason === null,
    unavailable_reason: reason,
    role_key: ctx.role,
    held_roles: ctx.roleResolution.held,
    can_write: ctx.caps.canWrite,
    features: {
      voice: features.voice,
      uploads: features.uploads,
      memory: features.memory,
      proactive_alerts: features.proactive_alerts,
      knowledge_base: features.knowledge_base,
      write_actions: features.write_actions && ctx.caps.canWrite,
      rollback: features.rollback,
      handover: features.handover,
      chat_history: features.chat_history,
    },
    suggestions: reason ? [] : suggestionsFor(ctx.policy.suggestions, ctx.page.entity_type),
    alerts,
    limits: {
      max_input_chars: ctx.settings.max_input_chars,
      max_attachments: features.uploads ? ctx.settings.max_attachments : 0,
      max_attachment_mb: ctx.settings.max_attachment_mb,
      messages_today: quota.messages_today,
      messages_per_day: quota.messages_per_day,
    },
  };
}
