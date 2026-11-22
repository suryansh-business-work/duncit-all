import type { useTranslation } from '@duncit/shell';

/** Per-kind table identity: its saved-view id, name column, extra column and empty text. */
export type CrmLeadEntity = 'host' | 'venue' | 'ecomm' | 'creator' | 'community';
export type LeadFilterOption = { value: string; label: string };

interface EntityMeta {
  tableId: string;
  nameField: string;
  nameHeader: string;
  /** Entity-specific column between the name and City (host Type / ecomm Brand). */
  extra?: { field: string; headerName: string };
  emptyText: string;
}

type Translate = ReturnType<typeof useTranslation>['t'];

export const leadEntityMeta = (t: Translate): Record<CrmLeadEntity, EntityMeta> => ({
  host: {
    tableId: 'crm-host-leads',
    nameField: 'host_name',
    nameHeader: 'Host',
    extra: { field: 'host_type', headerName: t('shell.common.type') },
    emptyText: 'No host leads yet. Click "New Host Lead" to create the first one.',
  },
  venue: {
    tableId: 'crm-venue-leads',
    nameField: 'venue_name',
    nameHeader: t('crm.common.venue'),
    emptyText: 'No venue leads yet. Click "New Venue Lead" to create the first one.',
  },
  ecomm: {
    tableId: 'crm-ecomm-leads',
    nameField: 'seller_name',
    nameHeader: 'Seller',
    extra: { field: 'brand_name', headerName: t('crm.common.brand') },
    emptyText: 'No ecomm leads yet. Click "New Ecomm Lead" to create the first one.',
  },
  creator: {
    tableId: 'crm-creator-leads',
    nameField: 'creator_name',
    nameHeader: t('crm.creatorLeads.nameHeader'),
    extra: { field: 'primary_platform', headerName: t('crm.creatorLeads.primaryPlatform') },
    emptyText: t('crm.creatorLeads.emptyText'),
  },
  community: {
    tableId: 'crm-community-leads',
    nameField: 'community_name',
    nameHeader: t('crm.communityLeads.nameHeader'),
    extra: { field: 'community_type', headerName: t('crm.communityLeads.communityType') },
    emptyText: t('crm.communityLeads.emptyText'),
  },
});
