import type { DocumentNode } from 'graphql';
import type { ProspectLeadEntity } from '../../api/crm.types';
import type { CommunityLead, CreatorLead, ProspectLead } from '../../api/prospectLeads.types';
import {
  COMMUNITY_LEAD,
  COMMUNITY_LEADS_TABLE,
  CREATE_COMMUNITY_LEAD,
  CREATE_CREATOR_LEAD,
  CREATOR_LEAD,
  CREATOR_LEADS_TABLE,
  DELETE_COMMUNITY_LEAD,
  DELETE_CREATOR_LEAD,
  UPDATE_COMMUNITY_LEAD,
  UPDATE_CREATOR_LEAD,
} from '../../api/prospectLeads.gql';
import {
  communityLeadInitialValues,
  creatorLeadInitialValues,
  fromCommunityLead,
  fromCreatorLead,
  toCommunityLeadInput,
  toCreatorLeadInput,
  type ProspectLeadFormValues,
} from '../../forms/prospect-lead';

/** Translation keys a prospect page reads, per kind. Every key is written out in full (gate rule). */
export interface ProspectCopy {
  title: string;
  subtitle: string;
  newLead: string;
  editLead: string;
  createLabel: string;
  updateLabel: string;
  deleteTitle: string;
  deleteMessage: string;
  deleted: string;
  notFound: string;
  back: string;
}

export interface ProspectKindUi {
  entity: ProspectLeadEntity;
  basePath: string;
  /** Lead-table meta key (components/lead-table). */
  tableEntity: 'creator' | 'community';
  copy: ProspectCopy;
  docs: {
    table: DocumentNode;
    tableKey: string;
    get: DocumentNode;
    getKey: 'creatorLead' | 'communityLead';
    create: DocumentNode;
    createKey: 'createCreatorLead' | 'createCommunityLead';
    update: DocumentNode;
    updateKey: 'updateCreatorLead' | 'updateCommunityLead';
    remove: DocumentNode;
  };
  initialValues: ProspectLeadFormValues;
  fromLead: (lead: ProspectLead) => ProspectLeadFormValues;
  toInput: (values: ProspectLeadFormValues) => Record<string, unknown>;
  displayName: (lead: ProspectLead) => string;
}

const CREATOR: ProspectKindUi = {
  entity: 'CREATOR_LEAD',
  basePath: '/creator-leads',
  tableEntity: 'creator',
  copy: {
    title: 'shell.nav.creatorLeads',
    subtitle: 'crm.creatorLeads.subtitle',
    newLead: 'crm.creatorLeads.newLead',
    editLead: 'crm.creatorLeads.editLead',
    createLabel: 'crm.creatorLeads.createLead',
    updateLabel: 'crm.creatorLeads.updateLead',
    deleteTitle: 'crm.creatorLeads.deleteLead',
    deleteMessage: 'crm.creatorLeads.deleteMessage',
    deleted: 'crm.creatorLeads.leadDeleted',
    notFound: 'crm.creatorLeads.leadNotFound',
    back: 'crm.creatorLeads.backToList',
  },
  docs: {
    table: CREATOR_LEADS_TABLE,
    tableKey: 'creatorLeadsTable',
    get: CREATOR_LEAD,
    getKey: 'creatorLead',
    create: CREATE_CREATOR_LEAD,
    createKey: 'createCreatorLead',
    update: UPDATE_CREATOR_LEAD,
    updateKey: 'updateCreatorLead',
    remove: DELETE_CREATOR_LEAD,
  },
  initialValues: creatorLeadInitialValues,
  fromLead: (lead) => fromCreatorLead(lead as CreatorLead),
  toInput: (values) => toCreatorLeadInput(values as typeof creatorLeadInitialValues),
  displayName: (lead) => (lead as CreatorLead).creator_name,
};

const COMMUNITY: ProspectKindUi = {
  entity: 'COMMUNITY_LEAD',
  basePath: '/community-leads',
  tableEntity: 'community',
  copy: {
    title: 'shell.nav.communityLeads',
    subtitle: 'crm.communityLeads.subtitle',
    newLead: 'crm.communityLeads.newLead',
    editLead: 'crm.communityLeads.editLead',
    createLabel: 'crm.communityLeads.createLead',
    updateLabel: 'crm.communityLeads.updateLead',
    deleteTitle: 'crm.communityLeads.deleteLead',
    deleteMessage: 'crm.communityLeads.deleteMessage',
    deleted: 'crm.communityLeads.leadDeleted',
    notFound: 'crm.communityLeads.leadNotFound',
    back: 'crm.communityLeads.backToList',
  },
  docs: {
    table: COMMUNITY_LEADS_TABLE,
    tableKey: 'communityLeadsTable',
    get: COMMUNITY_LEAD,
    getKey: 'communityLead',
    create: CREATE_COMMUNITY_LEAD,
    createKey: 'createCommunityLead',
    update: UPDATE_COMMUNITY_LEAD,
    updateKey: 'updateCommunityLead',
    remove: DELETE_COMMUNITY_LEAD,
  },
  initialValues: communityLeadInitialValues,
  fromLead: (lead) => fromCommunityLead(lead as CommunityLead),
  toInput: (values) => toCommunityLeadInput(values as typeof communityLeadInitialValues),
  displayName: (lead) => (lead as CommunityLead).community_name,
};

export const PROSPECT_KINDS: Record<ProspectLeadEntity, ProspectKindUi> = {
  CREATOR_LEAD: CREATOR,
  COMMUNITY_LEAD: COMMUNITY,
};
