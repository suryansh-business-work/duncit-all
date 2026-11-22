import type { ChipProps } from '@mui/material';
import type { CrmLeadQualityConfigStatus } from '@duncit/gql-types';

/** A scoring-model version's status as copy and chip colour — literal keys for the localization gate. */
export const CONFIG_STATUS_KEY: Record<CrmLeadQualityConfigStatus, string> = {
  PUBLISHED: 'crm.leadQualitySettings.statusPublished',
  DRAFT: 'crm.leadQualitySettings.statusDraft',
  ARCHIVED: 'crm.leadQualitySettings.statusArchived',
};

export const CONFIG_STATUS_COLOR: Record<CrmLeadQualityConfigStatus, ChipProps['color']> = {
  PUBLISHED: 'success',
  DRAFT: 'warning',
  ARCHIVED: 'default',
};

/** What a settings change-log entry was. */
export const CHANGE_KIND_KEY: Record<string, string> = {
  CONFIG_DRAFT: 'crm.leadQualitySettings.kindDraft',
  CONFIG_PUBLISH: 'crm.leadQualitySettings.kindPublish',
  CONFIG_DISCARD: 'crm.leadQualitySettings.kindDiscard',
};
