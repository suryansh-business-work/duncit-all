import type { TableEntityConfig } from '@utils/table-query';
import { leadTableConfig } from '@modules/crm/crm/crm.service';
import { CommunityLeadModel, CreatorLeadModel } from './prospectLead.model';

/** The two prospect lead kinds, keyed by their `CrmEntityType`. */
export const PROSPECT_KINDS = ['CREATOR_LEAD', 'COMMUNITY_LEAD'] as const;
export type ProspectKind = (typeof PROSPECT_KINDS)[number];

export interface ProspectKindConfig {
  model: typeof CreatorLeadModel | typeof CommunityLeadModel;
  /** The required display-name field. */
  nameField: string;
  /** Lowercase noun used in error messages ("creator lead"). */
  label: string;
  table: TableEntityConfig;
}

export const PROSPECT_CONFIG: Record<ProspectKind, ProspectKindConfig> = {
  CREATOR_LEAD: {
    model: CreatorLeadModel,
    nameField: 'creator_name',
    label: 'creator lead',
    table: leadTableConfig('creator_name', {
      searchFields: ['handle', 'primary_platform'],
      sortFields: { primary_platform: 'primary_platform', followers_count: 'followers_count' },
      filterFields: { primary_platform: { type: 'string' }, followers_count: { type: 'number' } },
    }),
  },
  COMMUNITY_LEAD: {
    model: CommunityLeadModel,
    nameField: 'community_name',
    label: 'community lead',
    table: leadTableConfig('community_name', {
      searchFields: ['community_type', 'platform'],
      sortFields: { community_type: 'community_type', member_count: 'member_count' },
      filterFields: { community_type: { type: 'string' }, member_count: { type: 'number' } },
    }),
  },
};

/** Numeric profile fields: blanks arrive as null, never as 0. */
export const NUMERIC_FIELDS = ['followers_count', 'engagement_rate', 'member_count'] as const;
