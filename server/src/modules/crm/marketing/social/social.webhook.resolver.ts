import type { GraphQLContext } from '@context';
import { requireRole } from '@middleware/rbac';
import { SETTINGS_MANAGE_ROLES } from './social.conversation.resolver';
import type { SocialWebhookDeliveryDoc } from './social.webhook.delivery.model';
import { recentDeliveries } from './social.webhook.queue';
import { registerWebhook, webhookSetup } from './social.webhook.setup';

/**
 * Social Accounts › Webhooks. The raw deliveries carry what people wrote and
 * the setup touches the Meta app itself, so both are for those who run the
 * team — the same roles that change Social Settings. Checked here, on the server.
 */
type Ctx = GraphQLContext;

const iso = (value: unknown) => (value instanceof Date ? value.toISOString() : null);

const deliveryOut = (doc: SocialWebhookDeliveryDoc) => ({
  id: String(doc._id),
  object: doc.object ?? '',
  entry_ids: doc.entry_ids ?? [],
  fields: doc.fields ?? [],
  status: doc.status,
  attempts: doc.attempts ?? 0,
  outcome: {
    events: doc.outcome?.events ?? 0,
    stored: doc.outcome?.stored ?? 0,
    duplicates: doc.outcome?.duplicates ?? 0,
    echoes: doc.outcome?.echoes ?? 0,
    unknown_account: doc.outcome?.unknown_account ?? 0,
    failed: doc.outcome?.failed ?? 0,
  },
  error: doc.error ?? '',
  body: doc.body,
  received_at: iso(doc.received_at) ?? new Date(0).toISOString(),
  processed_at: iso(doc.processed_at),
});

export const socialWebhookQueries = {
  socialWebhookDeliveries: async (_p: unknown, args: { limit?: number | null }, ctx: Ctx) => {
    requireRole(ctx, SETTINGS_MANAGE_ROLES);
    const rows = await recentDeliveries(args.limit ?? undefined);
    return rows.map(deliveryOut);
  },
  socialWebhookSetup: (_p: unknown, _a: unknown, ctx: Ctx) => {
    requireRole(ctx, SETTINGS_MANAGE_ROLES);
    return webhookSetup();
  },
};

export const socialWebhookMutations = {
  registerSocialWebhook: (_p: unknown, args: { entry_id: string }, ctx: Ctx) => {
    const user = requireRole(ctx, SETTINGS_MANAGE_ROLES);
    return registerWebhook(args.entry_id, user);
  },
};
