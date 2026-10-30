import { useEffect, useState } from 'react';
import { fireAndForget, logs } from '@duncit/logs';
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
  /**
   * A fetch is in flight. True during the first load and during every 60s
   * refresh, so the page can show it is working instead of showing figures
   * that may already be a minute old with no sign of it.
   */
  refreshing: boolean;
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
  const [pending, setPending] = useState(0);

  useEffect(() => {
    const ctrl = new AbortController();
    // Counted rather than a boolean: three loaders overlap on the first paint
    // and again whenever a 60s tick lands on a 5min one, and the first to
    // finish would otherwise clear a bar the other two are still earning.
    const track = async (run: () => Promise<void>) => {
      setPending((count) => count + 1);
      try {
        await run();
      } finally {
        setPending((count) => count - 1);
      }
    };

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

    const refreshSummary = () => fireAndForget(track(loadSummary), logs.website.status, 'useStatusData', 'summary');
    const refreshIncidents = () => fireAndForget(track(loadIncidents), logs.website.status, 'useStatusData', 'incidents');

    fireAndForget(track(loadServices), logs.website.status, 'useStatusData', 'services');
    refreshSummary();
    refreshIncidents();
    const summaryTimer = setInterval(refreshSummary, SUMMARY_REFRESH_MS);
    const incidentsTimer = setInterval(refreshIncidents, INCIDENTS_REFRESH_MS);

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
    refreshing: pending > 0,
    error,
    lastUpdated,
  };
}
