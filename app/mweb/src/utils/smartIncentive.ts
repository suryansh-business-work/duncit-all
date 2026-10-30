import { useEffect } from 'react';
import { gql, type TypedDocumentNode } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import type {
  MutationUnlockSmartIncentiveArgs,
  PodSmartIncentive,
  QueryPodSmartIncentiveArgs,
  SmartIncentiveSettings,
} from '@duncit/gql-types';
import { logs } from '@duncit/logs';
import { DEFAULT_SMART_INCENTIVE_DELAY_SECONDS, DEFAULT_SMART_INCENTIVE_MAX_PCT } from '@duncit/utils';

/** A member's Smart Incentive on one pod, as the pod page and checkout read it. */
export type PodSmartIncentiveState = Pick<PodSmartIncentive, 'pod_id' | 'discount_pct' | 'delay_seconds' | 'unlocked'>;

type SmartIncentiveSettingsView = Pick<SmartIncentiveSettings, 'enabled' | 'delay_seconds' | 'max_discount_pct'>;

const SMART_INCENTIVE_SETTINGS: TypedDocumentNode<
  { smartIncentiveSettings: SmartIncentiveSettingsView },
  Record<string, never>
> = gql`
  query SmartIncentiveSettingsForHost {
    smartIncentiveSettings {
      enabled
      delay_seconds
      max_discount_pct
    }
  }
`;

/** One selection for the read and the unlock, so the unlock's answer can stand in for the read in the cache. */
const POD_SMART_INCENTIVE_FIELDS = gql`
  fragment PodSmartIncentiveFields on PodSmartIncentive {
    pod_id
    discount_pct
    delay_seconds
    unlocked
  }
`;

/** The signed-in member's offer on one pod — null when there is nothing to offer them. */
export const POD_SMART_INCENTIVE: TypedDocumentNode<
  { podSmartIncentive: PodSmartIncentiveState | null },
  QueryPodSmartIncentiveArgs
> = gql`
  query PodSmartIncentive($pod_id: ID!) {
    podSmartIncentive(pod_id: $pod_id) {
      ...PodSmartIncentiveFields
    }
  }
  ${POD_SMART_INCENTIVE_FIELDS}
`;

/** The pod page showed the offer: the server records it and freezes its percentage. Idempotent. */
export const UNLOCK_SMART_INCENTIVE: TypedDocumentNode<
  { unlockSmartIncentive: PodSmartIncentiveState },
  MutationUnlockSmartIncentiveArgs
> = gql`
  mutation UnlockSmartIncentive($pod_id: ID!) {
    unlockSmartIncentive(pod_id: $pod_id) {
      ...PodSmartIncentiveFields
    }
  }
  ${POD_SMART_INCENTIVE_FIELDS}
`;

/**
 * Loyalty > Smart Incentive's settings as a host's Create Pod reads them:
 * whether the programme is on, the biggest discount a host may offer and the
 * delay the explainer quotes. Reads as switched off, with the shared defaults,
 * until they load — so the editor only appears once the programme is known to
 * be on. A failed read keeps it hidden, and is logged.
 */
export function useSmartIncentiveSettings() {
  const { data, error } = useQuery(SMART_INCENTIVE_SETTINGS, { fetchPolicy: 'cache-first' });
  useEffect(() => {
    if (error) logs.mWeb.warn('SmartIncentive', 'smartIncentiveSettings', { error });
  }, [error]);
  const settings = data?.smartIncentiveSettings;
  return {
    enabled: settings?.enabled ?? false,
    maxPct: settings?.max_discount_pct ?? DEFAULT_SMART_INCENTIVE_MAX_PCT,
    delaySeconds: settings?.delay_seconds ?? DEFAULT_SMART_INCENTIVE_DELAY_SECONDS,
  };
}

interface PodSmartIncentiveOptions {
  skip: boolean;
  fetchPolicy: 'cache-first' | 'cache-and-network';
}

/**
 * The signed-in member's offer on one pod, or null: the programme is off, the
 * pod does not offer it (or can no longer be booked), or they host it or hold a
 * seat. `unlockedPct` is what checkout takes off — the offer's frozen % once it
 * has been unlocked, else 0. A failed read is logged and reads as no offer: the
 * pod page then shows no popup, and checkout's server prices the charge either way.
 */
export function usePodSmartIncentive(
  podId: string | null | undefined,
  { skip, fetchPolicy }: PodSmartIncentiveOptions,
) {
  const { data, loading, error } = useQuery(POD_SMART_INCENTIVE, {
    variables: { pod_id: podId ?? '' },
    skip: skip || !podId,
    fetchPolicy,
  });
  useEffect(() => {
    if (error) logs.mWeb.warn('SmartIncentive', 'podSmartIncentive', { error });
  }, [error]);
  const state = data?.podSmartIncentive ?? null;
  return {
    state,
    unlockedPct: state?.unlocked ? state.discount_pct : 0,
    loading: loading && !data,
  };
}
