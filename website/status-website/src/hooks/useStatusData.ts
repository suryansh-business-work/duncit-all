import { useEffect, useState } from 'react';
import { fetchServices, fetchSummary } from '../api';
import type { ServiceGroup, StatusEnvironment, SummaryResponse } from '../types';

const SUMMARY_REFRESH_MS = 60_000;

export interface StatusData {
  groups: ServiceGroup[] | null;
  environment: StatusEnvironment | null;
  summary: SummaryResponse | null;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

/** Service catalog (fetched once) + live summary (refreshed every 60s). */
export function useStatusData(): StatusData {
  const [groups, setGroups] = useState<ServiceGroup[] | null>(null);
  const [environment, setEnvironment] = useState<StatusEnvironment | null>(null);
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();

    const loadServices = async () => {
      try {
        const data = await fetchServices(ctrl.signal);
        setGroups(data.groups);
        setEnvironment(data.environment);
        setError(null);
      } catch {
        if (!ctrl.signal.aborted) setError('Could not load the service catalog.');
      }
    };

    const loadSummary = async () => {
      try {
        const data = await fetchSummary(ctrl.signal);
        setSummary(data);
        setLastUpdated(new Date());
      } catch {
        if (!ctrl.signal.aborted) setError('Could not refresh service status.');
      }
    };

    loadServices().catch(() => undefined);
    loadSummary().catch(() => undefined);
    const interval = setInterval(() => {
      loadSummary().catch(() => undefined);
    }, SUMMARY_REFRESH_MS);

    return () => {
      ctrl.abort();
      clearInterval(interval);
    };
  }, []);

  return {
    groups,
    environment,
    summary,
    loading: groups === null && error === null,
    error,
    lastUpdated,
  };
}
