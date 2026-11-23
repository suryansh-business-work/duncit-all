import { GraphQLError } from 'graphql';
import { crmService } from '@modules/crm/crm/crm.service';
import { prospectLeadService } from '@modules/crm/prospectLead/prospectLead.service';
import { RESEARCH_LEAD_SOURCE } from '@modules/crm/crm/crm.constants';
import { crmContacts } from '@modules/crm/marketing/leads/marketingLead.promote';
import type { QualityLeadType } from '@modules/crm/leadQuality/leadQuality.rules';
import type { LeadCandidateDoc } from './leadResearch.model';

/**
 * A candidate becomes a CRM lead through the CRM's own create function for its
 * kind — the same assignee handling and the same duplicate guard as a lead
 * typed into the console. Nothing is invented: fields the research did not
 * find stay empty for the team to fill.
 */

/**
 * The Marketing pipeline's contact layout (one contact per phone, emails spread
 * across them), minus what research did not establish: the business name is
 * not a person's name, and a phone is not known to be on WhatsApp.
 */
export function contactsOf(c: Pick<LeadCandidateDoc, 'name' | 'phones' | 'emails'>) {
  return crmContacts({ name: c.name, phones: c.phones ?? [], emails: c.emails ?? [] }).map((contact) => ({
    ...contact,
    name: '',
    whatsapp_number: '',
  }));
}

/** "Researched lead" note with every source, so the team can see where it came from. */
export function researchNote(c: Pick<LeadCandidateDoc, 'description' | 'sources' | '_id'>): string {
  const sources = (c.sources ?? []).map((s) => `${s.title || s.kind}: ${s.url}`).join('\n');
  return [`Added from Lead Research candidate ${String(c._id)}.`, c.description ?? '', sources ? `Sources:\n${sources}` : '']
    .filter(Boolean)
    .join('\n\n');
}

export function crmInputFor(lead_type: QualityLeadType, c: LeadCandidateDoc): Record<string, unknown> {
  const instagram_link = c.instagram_handle ? `https://www.instagram.com/${c.instagram_handle}/` : '';
  const shared = {
    city: c.city ?? '',
    area: c.area ?? '',
    contacts: contactsOf(c),
    website: c.website ?? '',
    instagram_link,
    lead_source: RESEARCH_LEAD_SOURCE,
  };
  const note = researchNote(c);
  switch (lead_type) {
    case 'VENUE_LEAD': {
      if (!c.city) throw new GraphQLError('A venue lead needs a city. Add it to the candidate first.', { extensions: { code: 'BAD_USER_INPUT' } });
      const full_address = c.address || [c.area, c.city].filter(Boolean).join(', ');
      return { ...shared, venue_name: c.name, full_address, remarks: note };
    }
    case 'HOST_LEAD':
      return { ...shared, host_name: c.name, notes: note };
    case 'ECOMM_LEAD':
      return { ...shared, seller_name: c.name, brand_name: c.name, notes: note };
    case 'CREATOR_LEAD':
      return { ...shared, creator_name: c.name, handle: c.instagram_handle ? `@${c.instagram_handle}` : '', primary_platform: c.instagram_handle ? 'Instagram' : '', notes: note };
    default:
      return { ...shared, community_name: c.name, platform: c.instagram_handle ? 'Instagram' : '', notes: note };
  }
}

/** Create the CRM lead; returns its id. Throws the CRM's own errors (DUPLICATE_LEAD, BAD_USER_INPUT). */
export async function createCrmLead(lead_type: QualityLeadType, c: LeadCandidateDoc): Promise<string> {
  const input = crmInputFor(lead_type, c);
  switch (lead_type) {
    case 'VENUE_LEAD':
      return String((await crmService.createVenueLead(input))?.id);
    case 'HOST_LEAD':
      return String((await crmService.createHostLead(input))?.id);
    case 'ECOMM_LEAD':
      return String((await crmService.createEcommLead(input))?.id);
    default:
      return String((await prospectLeadService.create(lead_type, input))?.id);
  }
}
