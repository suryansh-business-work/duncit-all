import type { ChipProps } from '@mui/material';
import type { CrmLeadQualityConfigStatus } from '@duncit/gql-types';
import { CRM_QUALITY_CHANGE_KIND_KEY, CRM_QUALITY_CONFIG_STATUS_KEY, CRM_QUALITY_CONFIG_STATUS_TONE } from '@duncit/utils';

/* A version's status and a change-log entry's kind: copy keys and tones shared with the Duncit CRM app (@duncit/utils). */
export const CONFIG_STATUS_KEY: Record<CrmLeadQualityConfigStatus, string> = { ...CRM_QUALITY_CONFIG_STATUS_KEY };

export const CONFIG_STATUS_COLOR: Record<CrmLeadQualityConfigStatus, ChipProps['color']> = { ...CRM_QUALITY_CONFIG_STATUS_TONE };

/** What a settings change-log entry was. */
export const CHANGE_KIND_KEY: Record<string, string> = { ...CRM_QUALITY_CHANGE_KIND_KEY };
