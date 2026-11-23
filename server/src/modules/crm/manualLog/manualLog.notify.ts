import { Types } from 'mongoose';
import { logs } from '@observability/log';
import { getStatusEnvironment } from '@observability/statusServices';
import { PORTAL_REGISTRY } from '@modules/platform/portalMode/portalMode.registry';
import { sendEmail } from '@services/email/email.service';
import { CRM_LOG_MENTION_TEMPLATE } from '@services/email/catalogue/catalogue.crm';
import type { CrmLeadEntityType } from '@modules/crm/crm/crm.constants';
import { LEAD_LABELS, LEAD_MODELS } from '@modules/crm/crm/leadModels';
import { activeStaffByIds } from '@modules/crm/crmUser/crmUser.service';

/** Each lead kind's display-name field and its detail page in the CRM portal. */
const LEAD_PAGES: Record<CrmLeadEntityType, { nameField: string; path: string }> = {
  VENUE_LEAD: { nameField: 'venue_name', path: 'venue-leads' },
  HOST_LEAD: { nameField: 'host_name', path: 'host-leads' },
  ECOMM_LEAD: { nameField: 'seller_name', path: 'ecomm-leads' },
  CREATOR_LEAD: { nameField: 'creator_name', path: 'creator-leads' },
  COMMUNITY_LEAD: { nameField: 'community_name', path: 'community-leads' },
};

const TITLE_FROM_TEXT = 80;

/** The lead's Manual Logs tab on this environment's CRM portal (staging gets the staging host). */
export function leadLogsUrl(entity_type: CrmLeadEntityType, entity_id: string): string {
  const registered = PORTAL_REGISTRY.find((portal) => portal.key === 'crm')?.url ?? 'https://crm.duncit.com/';
  const url = new URL(registered);
  if (getStatusEnvironment() === 'staging') url.hostname = `staging.${url.hostname}`;
  url.pathname = `/${LEAD_PAGES[entity_type].path}/${entity_id}/view`;
  // @duncit/tabs' URL parameter (TAB_PARAM) — the page opens on its Manual Logs tab.
  url.searchParams.set('selectedtab', 'manual-logs');
  return url.toString();
}

async function leadName(entity_type: CrmLeadEntityType, entity_id: string): Promise<string> {
  const { nameField } = LEAD_PAGES[entity_type];
  const doc = await LEAD_MODELS[entity_type].collection.findOne(
    { _id: new Types.ObjectId(entity_id) },
    { projection: { [nameField]: 1 } }
  );
  const name = doc?.[nameField];
  return typeof name === 'string' && name.trim() ? name.trim() : LEAD_LABELS[entity_type];
}

export interface MentionNotice {
  entity_type: CrmLeadEntityType;
  entity_id: string;
  log_id: string;
  summary: string;
  body_text: string;
  /** Users to tell — already filtered to active CRM staff by the caller. */
  mentioned: readonly string[];
  /** The author, who is never emailed about their own log. */
  by: string;
}

/**
 * Email each newly @mentioned CRM team member about a manual log. Best effort:
 * a failure is logged and never undoes the save that triggered it.
 */
export async function notifyMentionedUsers(notice: MentionNotice): Promise<void> {
  const recipients = notice.mentioned.filter((id) => id !== notice.by);
  if (recipients.length === 0) return;
  try {
    const people = await activeStaffByIds([...recipients, notice.by]);
    const author = people.get(notice.by)?.name || 'A teammate';
    const lead_name = await leadName(notice.entity_type, notice.entity_id);
    const log_title = notice.summary || notice.body_text.slice(0, TITLE_FROM_TEXT);
    const lead_url = leadLogsUrl(notice.entity_type, notice.entity_id);
    await Promise.all(
      recipients.map((id) => {
        const person = people.get(id);
        if (!person?.email) return Promise.resolve();
        return sendEmail({
          to: person.email,
          subject: `${author} mentioned you on ${lead_name}`,
          template: CRM_LOG_MENTION_TEMPLATE,
          category: 'internal',
          vars: {
            name: person.name,
            author,
            lead_kind: LEAD_LABELS[notice.entity_type],
            lead_name,
            log_title,
            lead_url,
          },
        });
      })
    );
  } catch (error: unknown) {
    logs.server.warn('crm-log-mention', 'email', { error, log_id: notice.log_id, entity_type: notice.entity_type });
  }
}
