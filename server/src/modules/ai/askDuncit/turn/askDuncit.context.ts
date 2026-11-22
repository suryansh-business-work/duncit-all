import type { Request, Response } from 'express';
import type { AuthUser } from '@context';
import { effectiveRoleKeys } from '@modules/access/user/effective-roles';
import { UserModel } from '@modules/access/user/user.model';
import { getCatalog } from '@microservices/mcp/catalog/catalog';
import type { CallSession } from '@microservices/mcp/execute/pipeline';
import { mcpSettingsService } from '@microservices/mcp/settings/settings.service';
import { isFeatureEnabled } from '@modules/platform/settings/featureFlag.gate';
import { ASK_DUNCIT_FLAG, type AskDuncitRoleKey, type AskDuncitSurface } from '../askDuncit.constants';
import type { AuditActor } from '../audit/askDuncitAudit.service';
import { buildCallSession } from '../mcp/askDuncit.session';
import { resolveCapabilities, type Capabilities } from '../rbac/askDuncit.capabilities';
import { resolveRoleKey, type RoleResolution } from '../rbac/askDuncit.role';
import { askDuncitSettingsService } from '../settings/askDuncitSettings.service';
import type { AskDuncitRolePolicy, AskDuncitSettingsValue } from '../settings/askDuncitSettings.types';

/**
 * Everything one Ask Duncit operation needs about who is asking, resolved on
 * the server: the account's roles read FRESH from the database (a JWT can be
 * minutes stale after a role is removed), the assistant role, its policy, the
 * capability set, and an MCP session that runs tools as this person.
 */

export interface PageContext {
  route: string;
  entity_type: string;
  entity_id: string;
}

export interface TurnContext {
  user: AuthUser;
  userName: string;
  role: AskDuncitRoleKey;
  roleResolution: RoleResolution;
  policy: AskDuncitRolePolicy;
  settings: AskDuncitSettingsValue;
  caps: Capabilities;
  session: CallSession;
  surface: AskDuncitSurface;
  locale: string;
  page: PageContext;
  actor: AuditActor;
  /** The ask_duncit feature flag (Tech › Feature Flags). */
  flagEnabled: boolean;
}

export interface ContextInput {
  user: AuthUser;
  req: Request;
  res: Response;
  requestedRole?: string | null;
  surface?: AskDuncitSurface;
  locale?: string | null;
  page?: Partial<PageContext> | null;
}

const clip = (value: unknown, max: number) => String(value ?? '').trim().slice(0, max);

async function firstName(userId: string): Promise<string> {
  const doc = await UserModel.findById(userId)
    .select('profile.first_name')
    .lean<{ profile?: { first_name?: string } }>();
  return (doc?.profile?.first_name ?? '').trim().split(/\s+/)[0] ?? '';
}

export async function buildTurnContext(input: ContextInput): Promise<TurnContext> {
  const [roles, settings, mcpSettings, userName, flagEnabled] = await Promise.all([
    effectiveRoleKeys(input.user.id),
    askDuncitSettingsService.get(),
    mcpSettingsService.get(),
    firstName(input.user.id),
    isFeatureEnabled(ASK_DUNCIT_FLAG),
  ]);
  const user: AuthUser = { ...input.user, roles };
  const roleResolution = resolveRoleKey(roles, input.requestedRole);
  const role = roleResolution.role;
  const policy = settings.roles.find((r) => r.role_key === role) ?? (await askDuncitSettingsService.policyFor(role));
  const caps = resolveCapabilities({ user, policy, settings, mcpSettings, catalog: getCatalog() });
  const session = await buildCallSession({ user, req: input.req, res: input.res, scopes: caps.scopes });
  const page: PageContext = {
    route: clip(input.page?.route, 300),
    entity_type: clip(input.page?.entity_type, 40).toUpperCase(),
    entity_id: clip(input.page?.entity_id, 64),
  };
  const surface = input.surface ?? 'MWEB';
  const locale = clip(input.locale, 20);
  return {
    user,
    userName,
    role,
    roleResolution,
    policy,
    settings,
    caps,
    session,
    surface,
    locale,
    page,
    flagEnabled,
    actor: {
      user_id: user.id,
      user_name: userName,
      role_key: role,
      account_roles: roles,
      surface,
      locale,
      page_route: page.route,
      entity_type: page.entity_type,
      entity_id: page.entity_id,
    },
  };
}

/** Why this role cannot use the assistant right now, or null. Kill switches first. */
export function unavailableReason(
  settings: AskDuncitSettingsValue,
  policy: AskDuncitRolePolicy,
  flagEnabled = true
): 'KILL_SWITCH' | 'DISABLED' | 'ROLE_DISABLED' | null {
  if (settings.kill_switch || policy.kill_switch) return 'KILL_SWITCH';
  if (!settings.enabled || !flagEnabled) return 'DISABLED';
  if (!policy.enabled) return 'ROLE_DISABLED';
  return null;
}
