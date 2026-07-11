import { useEffect, useState } from 'react';
import { fetchIncidents, fetchServices, fetchSummary } from '../api';
import type {
  Incident,
  ServiceGroup,
  StatusEnvironment,
  SummaryResponse,
} from '../types';

const SUMMARY_REFRESH_MS = 60_000;
const INCIDENTS_REFRESH_MS = 300_000;

export interface StatusData {
  groups: ServiceGroup[] | null;
  environment: StatusEnvironment | null;
  summary: SummaryResponse | null;
  incidents: Incident[] | null;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

/** Service catalog (once) + live summary (60s) + incidents feed (5min). */
export function useStatusData(): StatusData {
  const [groups, setGroups] = useState<ServiceGroup[] | null>(null);
  const [environment, setEnvironment] = useState<StatusEnvironment | null>(null);
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [incidents, setIncidents] = useState<Incident[] | null>(null);
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

    const loadIncidents = async () => {
      try {
        const data = await fetchIncidents(ctrl.signal);
        setIncidents(data.incidents);
      } catch {
        if (!ctrl.signal.aborted) setIncidents([]);
      }
    };

    loadServices().catch(() => undefined);
    loadSummary().catch(() => undefined);
    loadIncidents().catch(() => undefined);
    const summaryTimer = setInterval(() => loadSummary().catch(() => undefined), SUMMARY_REFRESH_MS);
    const incidentsTimer = setInterval(
      () => loadIncidents().catch(() => undefined),
      INCIDENTS_REFRESH_MS
    );

    return () => {
      ctrl.abort();
      clearInterval(summaryTimer);
      clearInterval(incidentsTimer);
    };
  }, []);

  return {
    groups,
    environment,
    summary,
    incidents,
    loading: groups === null && error === null,
    error,
    lastUpdated,
  };
}
