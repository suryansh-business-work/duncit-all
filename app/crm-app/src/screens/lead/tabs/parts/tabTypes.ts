import { leadQueryFlags, type LeadKind } from '@/features/leads/leadKinds';
import type { Lead } from '@/features/leads/useLead';

/** What the lead page hands every tab. */
export interface LeadTabProps {
  kind: LeadKind;
  id: string;
  lead: Lead;
  /** Re-read the lead card after the tab changed something on it. */
  onChanged: () => void;
}

/** The variables of a tab query that reads one lead whatever its kind (the CrmAppLead flags). */
export const kindVars = (kind: LeadKind, id: string) => ({ id, ...leadQueryFlags(kind) });
