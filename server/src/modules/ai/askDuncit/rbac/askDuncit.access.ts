import type { AuthUser, GraphQLContext } from '@context';
import { requireRole } from '@middleware/rbac';
import type { AuditActor } from '../audit/askDuncitAudit.service';

/**
 * Who may open which part of Ask Duncit in the AI portal.
 *
 *  - Operators (AI_MANAGER, SUPER_ADMIN): dashboards, logs, violations,
 *    knowledge base, model settings, prompts, feedback review.
 *  - The AI Agent Control Center (SUPER_ADMIN only): role capabilities, MCP
 *    permissions, approval rules, quotas, feature flags and kill switches —
 *    the levers that change what the assistant may do for people.
 */
export const ASK_DUNCIT_OPERATOR_ROLES = ['SUPER_ADMIN', 'AI_MANAGER'] as const;
export const ASK_DUNCIT_CONTROL_ROLES = ['SUPER_ADMIN'] as const;

export const requireAskDuncitOperator = (ctx: GraphQLContext): AuthUser =>
  requireRole(ctx, ASK_DUNCIT_OPERATOR_ROLES);

export const requireAskDuncitControl = (ctx: GraphQLContext): AuthUser => requireRole(ctx, ASK_DUNCIT_CONTROL_ROLES);

/** An operator as the audit trail names them. */
export const operatorActor = (user: AuthUser): AuditActor => ({
  user_id: user.id,
  role_key: 'OPERATOR',
  account_roles: user.roles,
  surface: 'PORTAL',
});
