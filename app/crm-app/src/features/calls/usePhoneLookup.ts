import { useEffect, useState } from 'react';
import { CrmTelephony } from 'crm-telephony';

import { CrmAppPhoneLookupDocument } from '@/graphql/leads';
import { gqlRequest } from '@/services/graphql.client';
import { isLeadKind, type LeadKind } from '@/features/leads/leadKinds';
import { callKey } from './callPlan';

export interface PhoneOwner {
  kind: LeadKind;
  leadId: string;
  leadName: string;
  contactName: string;
  /** The lead's status and who it is assigned to ('' when the CRM has none). */
  status: string;
  assignee: string;
}

export type LookupState =
  | { status: 'idle' }
  | { status: 'looking' }
  | { status: 'found'; owner: PhoneOwner }
  | { status: 'none' };

const LOOKUP_DEBOUNCE_MS = 400;

/** The on-device directory first (instant, offline), the server second (a lead made since the last sync). */
export async function findOwner(number: string): Promise<PhoneOwner | null> {
  const local = await CrmTelephony?.lookupNumber(number);
  if (local && isLeadKind(local.entityType)) {
    return {
      kind: local.entityType,
      leadId: local.leadId,
      leadName: local.leadName,
      contactName: local.contactName,
      status: local.status ?? '',
      assignee: local.assignee ?? '',
    };
  }
  const { crmPhoneLookup } = await gqlRequest(CrmAppPhoneLookupDocument, { phone: number });
  const match = crmPhoneLookup.matches.find((m) => isLeadKind(m.entity_type));
  if (!match || !isLeadKind(match.entity_type)) return null;
  return {
    kind: match.entity_type,
    leadId: match.lead_id,
    leadName: match.lead_name,
    contactName: match.contact_name ?? '',
    status: match.lead_status ?? '',
    assignee: match.assigned_to ?? '',
  };
}

/** Who a typed number belongs to in the CRM, looked up once the typing pauses. */
export function usePhoneLookup(number: string): LookupState {
  const [state, setState] = useState<LookupState>({ status: 'idle' });
  useEffect(() => {
    if (!callKey(number)) {
      setState({ status: 'idle' });
      return undefined;
    }
    let live = true;
    setState({ status: 'looking' });
    const timer = setTimeout(() => {
      findOwner(number)
        .then((owner) => live && setState(owner ? { status: 'found', owner } : { status: 'none' }))
        .catch(() => live && setState({ status: 'none' }));
    }, LOOKUP_DEBOUNCE_MS);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [number]);
  return state;
}
