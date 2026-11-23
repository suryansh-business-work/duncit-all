import { GraphQLError } from 'graphql';
import type { MockedResponse } from '@apollo/client/testing';
import type { CrmLeadQualitySettings } from '@duncit/gql-types';
import {
  LEAD_QUALITY_SETTINGS,
  LEAD_QUALITY_SETTINGS_HISTORY,
  LEAD_QUALITY_VERSIONS,
  type LeadQualityConfig,
  type LeadQualityEvent,
} from '@/api/leadQuality.gql';

const anyVariables = () => true;

/** One lead type's settings, answering every read and refetch. */
export const settingsMock = (settings: CrmLeadQualitySettings): MockedResponse => ({
  request: { query: LEAD_QUALITY_SETTINGS, variables: { lead_type: settings.lead_type } },
  maxUsageCount: Number.POSITIVE_INFINITY,
  result: { data: { crmLeadQualitySettings: settings } },
});

export const versionsMock = (rows: LeadQualityConfig[]): MockedResponse => ({
  request: { query: LEAD_QUALITY_VERSIONS, variables: anyVariables },
  maxUsageCount: Number.POSITIVE_INFINITY,
  result: { data: { crmLeadQualityVersions: rows } },
});

export const historyMock = (rows: LeadQualityEvent[]): MockedResponse => ({
  request: { query: LEAD_QUALITY_SETTINGS_HISTORY, variables: anyVariables },
  maxUsageCount: Number.POSITIVE_INFINITY,
  result: { data: { crmLeadQualitySettingsHistory: rows } },
});

/** A refusal carrying `extensions`, as the API throws it. */
export const refused = (message: string, extensions: Record<string, unknown>) => ({ errors: [new GraphQLError(message, { extensions })] });
