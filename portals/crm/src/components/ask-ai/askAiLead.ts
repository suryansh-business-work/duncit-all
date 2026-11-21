import type { CrmContact } from '../../api/crm.types';
import type { AskAiLead } from './AskAiActionDialogs';

/** Same width as the drawer; exported here so pages can shift without importing the drawer twice. */
export const ASK_AI_PANEL_WIDTH = 420;

/** The drawer's view of a lead: its name and the first email / mobile on file. */
export function askAiLead(lead: { id: string; contacts: CrmContact[] }, displayName: string): AskAiLead {
  const first = (pick: (c: CrmContact) => string | null | undefined) =>
    lead.contacts.map((c) => (pick(c) ?? '').trim()).find(Boolean) ?? null;
  return {
    id: lead.id,
    display_name: displayName,
    primary_email: first((c) => c.email),
    primary_mobile: first((c) => c.mobile_number),
  };
}

/** Page margin that keeps content clear of the open drawer on tablet and up. */
export const askAiShift = (open: boolean) => ({
  transition: 'margin 0.2s ease',
  mr: open ? { xs: 0, sm: `${ASK_AI_PANEL_WIDTH}px` } : 0,
});
