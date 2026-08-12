import { GraphQLError } from 'graphql';
import type { AuthUser } from '@context';
import { ApprovalRequestModel } from '@modules/approval/approval.model';
import { UserModel } from '@modules/access/user/user.model';
import { PORTAL_REGISTRY } from '@modules/platform/portalMode/portalMode.registry';
import { PORTAL_GATE_EXEMPT_KEYS, PORTAL_ROLE_REQUIREMENTS } from './portal.constants';
import {
  sendPortalAccessApprovedEmail,
  sendPortalAccessDeniedEmail,
} from '@services/email/email.service';
import { logs } from '@observability/log';

/**
 * Admin access is never granted through this flow: its first required role is
 * SUPER_ADMIN, and handing that out from a request queue would bypass the
 * dedicated Super Admins panel (which sends its own security emails).
 */
const NON_REQUESTABLE = new Set(['admin']);

const badRequest = (message: string) =>
  new GraphQLError(message, { extensions: { code: 'BAD_USER_INPUT' } });

/** The staff consoles only — the member app and websites are not "portals" to jump to. */
const consoles = () => PORTAL_REGISTRY.filter((p) => p.kind === 'PORTAL');

/** Same decision assertPortalLogin enforces, as a boolean for the directory. */
function hasPortalAccess(portalKey: string, roleKeys: readonly string[]): boolean {
  if (PORTAL_GATE_EXEMPT_KEYS.has(portalKey)) return true;
  if (roleKeys.includes('SUPER_ADMIN')) return true;
  const allowed = PORTAL_ROLE_REQUIREMENTS[portalKey];
  return !!allowed && roleKeys.some((role) => allowed.includes(role));
}

const canRequest = (portalKey: string) =>
  !NON_REQUESTABLE.has(portalKey) && !PORTAL_GATE_EXEMPT_KEYS.has(portalKey);

export const portalAccessService = {
  /** The Jump to Portal directory for the signed-in user. */
  async directory(user: AuthUser) {
    const requests = await ApprovalRequestModel.find({
      type: 'PORTAL_ACCESS',
      subject_user_id: user.id,
    })
      .sort({ created_at: 1 })
      .select('target_id status')
      .lean();
    // Ascending sort so the LATEST request per portal wins the map.
    const latest = new Map<string, string>();
    for (const request of requests) {
      if (request.target_id) latest.set(String(request.target_id), String(request.status));
    }
    return consoles().map((portal) => ({
      key: portal.key,
      name: portal.name,
      url: portal.url,
      has_access: hasPortalAccess(portal.key, user.roles),
      can_request: canRequest(portal.key),
      request_status: latest.get(portal.key) ?? null,
    }));
  },

  /** Raise a PORTAL_ACCESS approval request for the Admin > Portal Access inbox. */
  async requestAccess(user: AuthUser, portalKey: string) {
    const portal = consoles().find((p) => p.key === portalKey);
    if (!portal) throw badRequest('Unknown portal');
    if (!canRequest(portalKey)) {
      throw badRequest('Access to this portal is not granted through requests');
    }
    if (hasPortalAccess(portalKey, user.roles)) {
      throw badRequest('You already have access to this portal');
    }
    const pending = await ApprovalRequestModel.exists({
      type: 'PORTAL_ACCESS',
      subject_user_id: user.id,
      target_id: portalKey,
      status: 'PENDING',
    });
    if (pending) throw badRequest('You have already requested access to this portal');

    const doc = await UserModel.findById(user.id)
      .select('auth.email profile.first_name profile.last_name')
      .lean();
    const name =
      [(doc as any)?.profile?.first_name, (doc as any)?.profile?.last_name]
        .filter(Boolean)
        .join(' ') ||
      user.email ||
      'A user';
    const grantsRole = (PORTAL_ROLE_REQUIREMENTS[portalKey] ?? [])[0] ?? '';
    await ApprovalRequestModel.create({
      type: 'PORTAL_ACCESS',
      title: `Portal access — ${portal.name}`,
      summary: `${name} requested access to the ${portal.name} console.`,
      details: [
        { label: 'Portal', value: portal.name },
        { label: 'Portal URL', value: portal.url },
        { label: 'Grants role', value: grantsRole },
      ],
      target_id: portalKey,
      subject_user_id: user.id,
      subject_name: name,
      subject_email: (doc as any)?.auth?.email ?? user.email ?? null,
      requested_by: user.id,
      requested_by_name: name,
    });
    return {
      key: portal.key,
      name: portal.name,
      url: portal.url,
      has_access: false,
      can_request: true,
      request_status: 'PENDING',
    };
  },

  /**
   * Side effect of the admin's decision on a PORTAL_ACCESS request: approval
   * grants the portal's role and emails the requester; denial only emails.
   * Best-effort like the other approval side effects — a failure here is a
   * logged error, never a blocked decision.
   */
  async applyDecision(doc: any, status: 'APPROVED' | 'DENIED') {
    const portalKey = String(doc?.target_id ?? '');
    const portal = PORTAL_REGISTRY.find((p) => p.key === portalKey);
    const to = doc?.subject_email ?? '';
    const name = doc?.subject_name || 'there';
    const portalName = portal?.name ?? portalKey;
    try {
      if (status === 'APPROVED') {
        const role = (PORTAL_ROLE_REQUIREMENTS[portalKey] ?? [])[0];
        if (role && doc?.subject_user_id) {
          const { userService } = await import('@modules/access/user/user.service');
          await userService.addRole(String(doc.subject_user_id), role);
        }
        // Unconditional send — a missing address becomes a FAILED log row, not silence.
        sendPortalAccessApprovedEmail({
          to,
          name,
          portal_name: portalName,
          portal_url: portal?.url ?? '',
        }).catch((e) =>
          logs.server.error('portals', 'portalAccess.applyDecision', {
            error: e,
            msg: 'Portal access approved email failed',
            portal_key: portalKey,
          })
        );
      } else {
        sendPortalAccessDeniedEmail({ to, name, portal_name: portalName }).catch((e) =>
          logs.server.error('portals', 'portalAccess.applyDecision', {
            error: e,
            msg: 'Portal access denied email failed',
            portal_key: portalKey,
          })
        );
      }
    } catch (err) {
      logs.server.error('portals', 'portalAccess.applyDecision', {
        error: err,
        msg: 'applyDecision failed',
        portal_key: portalKey,
        status,
      });
    }
  },
};
