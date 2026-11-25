import type { CrmLeadNearInput, TableQueryInput } from '@/generated/graphql/graphql';
import {
  CrmAppCommunityLeadsTableDocument,
  CrmAppCreatorLeadsTableDocument,
  CrmAppDeleteCommunityLeadDocument,
  CrmAppDeleteCreatorLeadDocument,
  CrmAppDeleteEcommLeadDocument,
  CrmAppDeleteHostLeadDocument,
  CrmAppDeleteVenueLeadDocument,
  CrmAppEcommLeadsTableDocument,
  CrmAppHostLeadsTableDocument,
  CrmAppVenueLeadsTableDocument,
} from '@/graphql/leadLists';
import type { LeadKind } from '@/features/leads/leadKinds';
import { gqlRequest } from '@/services/graphql.client';

/** One listing card: the fields every kind's `*LeadsTable` row answers (name and extra are aliased). */
export interface LeadListRow {
  id: string;
  name: string;
  extra?: string | null;
  city?: string | null;
  lead_status: string;
  priority: string;
  assigned_to?: string | null;
  next_follow_up_date?: string | null;
  created_at?: string | null;
  super_category?: { name: string } | null;
  contacts: { mobile_number?: string | null; email?: string | null }[];
  is_duplicate?: boolean | null;
  distance_km?: number | null;
  geo_precision?: string | null;
  quality?: {
    score: number;
    classification_label: string;
    tone: string;
    qualification: string;
  } | null;
  matched_user?: { platforms_used: string[]; last_activity_at?: string | null } | null;
}

export interface LeadListPage {
  total: number;
  /** Leads of this kind a nearby search cannot place (no city on the map). */
  unplaced?: number | null;
  rows: LeadListRow[];
}

export interface LeadListVars {
  query: TableQueryInput;
  near?: CrmLeadNearInput | null;
}

/** The translation keys a listing reads, per kind. Every key is written out (localization gate). */
export interface LeadListCopy {
  title: string;
  subtitle: string;
  newLead: string;
  nameHeader: string;
  extraHeader: string | null;
  deleteTitle: string;
  deleteMessage: string;
  deleted: string;
  empty: string;
}

export interface LeadListKind {
  copy: LeadListCopy;
  /** The server sort/filter field of the name and of the extra column. */
  nameField: string;
  extraField: string | null;
  /** Which crmLeadConfig list holds this kind's statuses (the portal's choice per kind). */
  statusList: 'venue_lead_statuses' | 'host_lead_statuses';
  /** The server matches venue, host and ecomm leads to Duncit accounts (Devices, Last activity). */
  matchedUser: boolean;
  /** Fill with AI and Excel import (venue and host lists only, as on the portal). */
  bulkCreate: boolean;
  fetchPage: (vars: LeadListVars) => Promise<LeadListPage>;
  remove: (id: string) => Promise<unknown>;
}

export const LEAD_LIST_KINDS: Record<LeadKind, LeadListKind> = {
  VENUE_LEAD: {
    copy: {
      title: 'shell.nav.venueLeads',
      subtitle: 'crm.venueLeads.captureAndTrackVenuePartnershipLeads',
      newLead: 'crm.venueLeads.newLead',
      nameHeader: 'crm.common.venue',
      extraHeader: null,
      deleteTitle: 'crm.venueLeads.deleteVenueLead',
      deleteMessage: 'crm.venueLeads.deleteMessage',
      deleted: 'crm.venueLeads.venueLeadDeleted',
      empty: 'crm.venueLeads.emptyText',
    },
    nameField: 'venue_name',
    extraField: null,
    statusList: 'venue_lead_statuses',
    matchedUser: true,
    bulkCreate: true,
    fetchPage: async (vars) =>
      (await gqlRequest(CrmAppVenueLeadsTableDocument, vars)).venueLeadsTable,
    remove: (id) => gqlRequest(CrmAppDeleteVenueLeadDocument, { id }),
  },
  HOST_LEAD: {
    copy: {
      title: 'shell.nav.hostLeads',
      subtitle: 'crm.hostLeads.captureAndQualifyHostAndOrganizer',
      newLead: 'crm.hostLeads.newLead',
      nameHeader: 'crm.common.host',
      extraHeader: 'shell.common.type',
      deleteTitle: 'crm.hostLeads.deleteHostLead',
      deleteMessage: 'crm.hostLeads.deleteMessage',
      deleted: 'crm.hostLeads.hostLeadDeleted',
      empty: 'crm.hostLeads.emptyText',
    },
    nameField: 'host_name',
    extraField: 'host_type',
    statusList: 'host_lead_statuses',
    matchedUser: true,
    bulkCreate: true,
    fetchPage: async (vars) =>
      (await gqlRequest(CrmAppHostLeadsTableDocument, vars)).hostLeadsTable,
    remove: (id) => gqlRequest(CrmAppDeleteHostLeadDocument, { id }),
  },
  ECOMM_LEAD: {
    copy: {
      title: 'shell.nav.ecommLeads',
      subtitle: 'crm.ecommLeads.captureAndQualifyProductSellersFrom',
      newLead: 'crm.ecommLeads.newLead',
      nameHeader: 'crm.ecommLeads.seller',
      extraHeader: 'crm.common.brand',
      deleteTitle: 'crm.ecommLeads.deleteEcommLead',
      deleteMessage: 'crm.ecommLeads.deleteMessage',
      deleted: 'crm.ecommLeads.ecommLeadDeleted',
      empty: 'crm.ecommLeads.emptyText',
    },
    nameField: 'seller_name',
    extraField: 'brand_name',
    statusList: 'host_lead_statuses',
    matchedUser: true,
    bulkCreate: false,
    fetchPage: async (vars) =>
      (await gqlRequest(CrmAppEcommLeadsTableDocument, vars)).ecommLeadsTable,
    remove: (id) => gqlRequest(CrmAppDeleteEcommLeadDocument, { id }),
  },
  CREATOR_LEAD: {
    copy: {
      title: 'shell.nav.creatorLeads',
      subtitle: 'crm.creatorLeads.subtitle',
      newLead: 'crm.creatorLeads.newLead',
      nameHeader: 'crm.creatorLeads.nameHeader',
      extraHeader: 'crm.creatorLeads.primaryPlatform',
      deleteTitle: 'crm.creatorLeads.deleteLead',
      deleteMessage: 'crm.creatorLeads.deleteMessage',
      deleted: 'crm.creatorLeads.leadDeleted',
      empty: 'crm.creatorLeads.emptyText',
    },
    nameField: 'creator_name',
    extraField: 'primary_platform',
    statusList: 'host_lead_statuses',
    matchedUser: false,
    bulkCreate: false,
    fetchPage: async (vars) =>
      (await gqlRequest(CrmAppCreatorLeadsTableDocument, vars)).creatorLeadsTable,
    remove: (id) => gqlRequest(CrmAppDeleteCreatorLeadDocument, { id }),
  },
  COMMUNITY_LEAD: {
    copy: {
      title: 'shell.nav.communityLeads',
      subtitle: 'crm.communityLeads.subtitle',
      newLead: 'crm.communityLeads.newLead',
      nameHeader: 'crm.communityLeads.nameHeader',
      extraHeader: 'crm.communityLeads.communityType',
      deleteTitle: 'crm.communityLeads.deleteLead',
      deleteMessage: 'crm.communityLeads.deleteMessage',
      deleted: 'crm.communityLeads.leadDeleted',
      empty: 'crm.communityLeads.emptyText',
    },
    nameField: 'community_name',
    extraField: 'community_type',
    statusList: 'host_lead_statuses',
    matchedUser: false,
    bulkCreate: false,
    fetchPage: async (vars) =>
      (await gqlRequest(CrmAppCommunityLeadsTableDocument, vars)).communityLeadsTable,
    remove: (id) => gqlRequest(CrmAppDeleteCommunityLeadDocument, { id }),
  },
};
