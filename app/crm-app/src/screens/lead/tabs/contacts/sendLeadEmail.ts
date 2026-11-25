import type { LeadKind } from '@/features/leads/leadKinds';
import {
  CrmAppComposeEcommEmailDocument,
  CrmAppComposeHostEmailDocument,
  CrmAppComposeProspectEmailDocument,
  CrmAppComposeVenueEmailDocument,
} from '@/graphql/leadTabs';
import { gqlRequest } from '@/services/graphql.client';

export interface LeadEmail {
  kind: LeadKind;
  id: string;
  to: string;
  subject: string;
  /** HTML, as the server sends it. */
  body: string;
  providerId: string;
  attachments: { url: string; name?: string | null }[];
}

/**
 * Emails a lead contact through the kind's own mutation — the same ones the
 * portal's compose window runs; creator and community leads share one that
 * takes the kind. The server logs it on the lead's timeline either way.
 */
export async function sendLeadEmail(
  email: LeadEmail,
): Promise<{ ok: boolean; message?: string | null }> {
  const vars = {
    id: email.id,
    contact_email: email.to.trim(),
    subject: email.subject,
    body: email.body,
    provider_id: email.providerId || null,
    attachments: email.attachments.map(({ url, name }) => ({ url, name: name ?? null })),
  };
  switch (email.kind) {
    case 'VENUE_LEAD':
      return (await gqlRequest(CrmAppComposeVenueEmailDocument, vars)).emailVenueLeadContact;
    case 'HOST_LEAD':
      return (await gqlRequest(CrmAppComposeHostEmailDocument, vars)).emailHostLeadContact;
    case 'ECOMM_LEAD':
      return (await gqlRequest(CrmAppComposeEcommEmailDocument, vars)).emailEcommLeadContact;
    default:
      return (
        await gqlRequest(CrmAppComposeProspectEmailDocument, { ...vars, entity_type: email.kind })
      ).emailCrmLeadContact;
  }
}
