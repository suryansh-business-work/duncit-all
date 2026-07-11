import { useEffect, useState } from 'react';
import { fetchHealth, fetchHistory, fetchProbe } from '../../api';
import type { HealthReport, HistoryResponse, ProbeResult, StatusService } from '../../types';

const HISTORY_HOURS = 24;

export interface ServiceDetails {
  probe: ProbeResult | null;
  probeError: string | null;
  health: HealthReport | null;
  healthError: boolean;
  history: HistoryResponse | null;
  historyError: boolean;
}

const EMPTY: ServiceDetails = {
  probe: null,
  probeError: null,
  health: null,
  healthError: false,
  history: null,
  historyError: false,
};

/** Loads live probe + optional health report + history when the dialog opens. */
export function useServiceDetails(service: StatusService | null): ServiceDetails {
  const [details, setDetails] = useState<ServiceDetails>(EMPTY);

  useEffect(() => {
    setDetails(EMPTY);
    if (!service) return undefined;
    const ctrl = new AbortController();

    const loadProbe = async () => {
      try {
        const probe = await fetchProbe(service.url, ctrl.signal);
        setDetails((prev) => ({ ...prev, probe }));
      } catch (err) {
        if (ctrl.signal.aborted) return;
        const message = err instanceof Error ? err.message : 'Could not load details';
        setDetails((prev) => ({ ...prev, probeError: message }));
      }
    };

    const loadHealth = async () => {
      if (!service.health) return;
      try {
        const health = await fetchHealth(service.health, ctrl.signal);
        setDetails((prev) => ({ ...prev, health }));
      } catch {
        if (!ctrl.signal.aborted) setDetails((prev) => ({ ...prev, healthError: true }));
      }
    };

    const loadHistory = async () => {
      try {
        const history = await fetchHistory(service.key, HISTORY_HOURS, ctrl.signal);
        setDetails((prev) => ({ ...prev, history }));
      } catch {
        if (!ctrl.signal.aborted) setDetails((prev) => ({ ...prev, historyError: true }));
      }
    };

    loadProbe().catch(() => undefined);
    loadHealth().catch(() => undefined);
    loadHistory().catch(() => undefined);
    return () => ctrl.abort();
  }, [service]);

  return details;
}
