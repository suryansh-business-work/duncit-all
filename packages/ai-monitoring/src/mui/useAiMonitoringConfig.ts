import { useMemo } from 'react';
import { gql } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import {
  AI_MONITORING_CONFIG_QUERY,
  isAiMonitoringChipVisible,
  resolveAiMonitoringCopy,
  type AiMonitoringConfig,
  type AiMonitoringCopy,
} from '../index';
import { useTranslation } from './useTranslation';

/** Apollo document for the shared selection — wrapped once, here. */
export const AI_MONITORING_CONFIG = gql(AI_MONITORING_CONFIG_QUERY);

interface Data {
  aiMonitoringConfig?: AiMonitoringConfig | null;
}

export interface AiMonitoringState {
  /** Whether the chip should render at all (admin switch). */
  visible: boolean;
  copy: AiMonitoringCopy;
}

/**
 * The admin-managed notice, resolved to the strings this reader sees.
 *
 * `cache-first` and no `skip`: the query is public, takes no arguments and is
 * Redis-cached server-side, so every upload field on a page shares one request
 * and a signed-out visitor gets the same answer as anyone else. Until it lands,
 * the localized fallback renders — an upload field must never be unable to say
 * what happens to the file.
 */
export function useAiMonitoringConfig(): AiMonitoringState {
  const { t } = useTranslation();
  const { data } = useQuery<Data>(AI_MONITORING_CONFIG, { fetchPolicy: 'cache-first' });
  const config = data?.aiMonitoringConfig ?? null;

  return useMemo(
    () => ({
      visible: isAiMonitoringChipVisible(config),
      copy: resolveAiMonitoringCopy(config, t),
    }),
    [config, t],
  );
}
