import { useEffect, useState } from 'react';
import type { ResultOf } from '@graphql-typed-document-node/core';

import { HostDashboardDocument, HostDashboardPodsDocument } from '@/graphql/studio-dashboard';
import { graphqlRequest } from '@/services/graphql.client';

type DashboardData = ResultOf<typeof HostDashboardDocument>;
export type HostWallet = DashboardData['myWallet'];
export type HostHealth = DashboardData['myAccountHealth'];
type HostPod = ResultOf<typeof HostDashboardPodsDocument>['pods'][number];

export interface HostDashboardStats {
  total: number;
  upcoming: number;
  paid: number;
}

/** Loads the host dashboard: identity, wallet, profile/verification health and
 * pod stats (B2-#5). Pods need the resolved user id, so they load second. */
export function useHostDashboard() {
  const [me, setMe] = useState<DashboardData['me']>(null);
  const [wallet, setWallet] = useState<HostWallet | null>(null);
  const [health, setHealth] = useState<HostHealth | null>(null);
  const [pods, setPods] = useState<HostPod[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<unknown>();

  useEffect(() => {
    let active = true;
    graphqlRequest(HostDashboardDocument, undefined, { auth: true })
      .then(async (data) => {
        if (!active) return;
        setMe(data.me ?? null);
        setWallet(data.myWallet ?? null);
        setHealth(data.myAccountHealth ?? null);
        const hostId = data.me?.user_id;
        if (!hostId) return;
        const podData = await graphqlRequest(
          HostDashboardPodsDocument,
          { host_user_id: hostId },
          { auth: true },
        ).catch(() => null);
        if (active && podData) setPods(podData.pods);
      })
      .catch((err) => active && setError(err))
      .finally(() => active && setIsLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const now = Date.now();
  const stats: HostDashboardStats = {
    total: pods.length,
    upcoming: pods.filter((p) => p.pod_date_time && new Date(p.pod_date_time).getTime() > now)
      .length,
    paid: pods.filter((p) => !p.pod_type?.includes('FREE')).length,
  };

  return { me, wallet, health, stats, isLoading, error };
}
