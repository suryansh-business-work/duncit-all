import { useMemo } from 'react';
import { useQuery } from '@apollo/client/react';
import { DEFAULT_SMART_INCENTIVE_DELAY_SECONDS, DEFAULT_SMART_INCENTIVE_MAX_PCT } from '@duncit/utils';
import { SMART_INCENTIVE_SETTINGS } from './queries';
import {
  podEditSmartIncentive,
  type PodEditSmartIncentive,
  type SmartIncentiveProgramme,
} from './pod-edit-smart-incentive';
import type { HostPodTarget } from './types';

interface SmartIncentiveSettingsData {
  smartIncentiveSettings: { enabled: boolean; delay_seconds: number; max_discount_pct: number };
}

/**
 * What stands in until Loyalty's settings answer: the programme reads as OFF,
 * so the editor never flashes up for a programme that turns out to be switched
 * off, and the limits are @duncit/utils' defaults.
 */
const LOADING_PROGRAMME: SmartIncentiveProgramme = {
  enabled: false,
  maxPct: DEFAULT_SMART_INCENTIVE_MAX_PCT,
  delaySeconds: DEFAULT_SMART_INCENTIVE_DELAY_SECONDS,
};

/**
 * Loyalty > Smart Incentive's settings — its switch, the biggest discount a
 * host may choose and the delay the explainer quotes. Cache-first: they change
 * rarely, and every open of the dialog would otherwise ask again.
 */
export function useSmartIncentiveProgramme(skip: boolean): SmartIncentiveProgramme {
  const { data } = useQuery<SmartIncentiveSettingsData>(SMART_INCENTIVE_SETTINGS, {
    fetchPolicy: 'cache-first',
    skip,
  });
  const settings = data?.smartIncentiveSettings;
  return useMemo(
    () =>
      settings
        ? { enabled: settings.enabled, maxPct: settings.max_discount_pct, delaySeconds: settings.delay_seconds }
        : LOADING_PROGRAMME,
    [settings],
  );
}

/** The edit dialog's Smart Incentive context, with the programme's live settings. */
export function usePodEditSmartIncentive(pod: HostPodTarget | null): PodEditSmartIncentive | null {
  const programme = useSmartIncentiveProgramme(!pod);
  return useMemo(() => podEditSmartIncentive(pod, programme), [pod, programme]);
}
