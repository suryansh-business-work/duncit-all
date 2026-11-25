import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useApolloClient } from '@apollo/client/react';
import { useApolloTableFetch, type TableFetch, type TableGqlClient } from '@duncit/table';
import { useTranslation } from '@duncit/shell';
import { parseApiError } from '@duncit/utils';

/** Bounds and presets of the radius (km), shared with the Duncit CRM app (@duncit/forms/schemas). */
export { NEARBY_RADIUS } from '@duncit/forms/schemas';

/** The radar stays up at least this long, so a fast answer still reads as a scan. */
export const MIN_SCAN_MS = 1200;

/** Where the search is centred: the browser's position, or a city (and area) from the admin Location list. */
export interface NearbySearch {
  source: 'me' | 'place';
  city: string;
  area: string;
  radius_km: number;
}

/** The `near` argument of the `*LeadsTable` queries. */
export interface LeadNear {
  lat?: number;
  lng?: number;
  city?: string;
  area?: string;
  radius_km: number;
}

export type NearbyScan =
  | { phase: 'idle' | 'locating' | 'searching' }
  | { phase: 'done'; total: number; unplaced: number | null }
  | { phase: 'error'; message: string };

export interface NearbyLeads {
  near: LeadNear | null;
  search: NearbySearch | null;
  scan: NearbyScan;
  start: (search: NearbySearch) => void;
  clear: () => void;
  client: TableGqlClient;
}

interface PageSummary {
  total?: number;
  unplaced?: number | null;
}

const GEO_OPTIONS: PositionOptions = { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 };

/**
 * State of a Nearby leads search for one lead table. `client` wraps Apollo so
 * the scan learns how many leads the table's own nearby read found: there is
 * no second request, and the table keeps its GET API source.
 */
export function useNearbyLeads(resultKey: string): NearbyLeads {
  const apollo = useApolloClient();
  const { t } = useTranslation();
  const [near, setNear] = useState<LeadNear | null>(null);
  const [search, setSearch] = useState<NearbySearch | null>(null);
  const [scan, setScan] = useState<NearbyScan>({ phase: 'idle' });
  const startedAt = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const awaiting = useRef(false);

  useEffect(() => () => clearTimeout(timer.current), []);

  const finish = useCallback((next: NearbyScan) => {
    awaiting.current = false;
    const wait = Math.max(0, MIN_SCAN_MS - (Date.now() - startedAt.current));
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setScan(next), wait);
  }, []);

  const client = useMemo<TableGqlClient>(() => {
    const base: TableGqlClient = apollo;
    return {
      async query(options) {
        const isNearbyRead = Boolean(options.variables?.near);
        try {
          const result = await base.query(options);
          if (isNearbyRead && awaiting.current) {
            const page = (result?.data as Record<string, PageSummary> | undefined)?.[resultKey];
            finish({ phase: 'done', total: page?.total ?? 0, unplaced: page?.unplaced ?? null });
          }
          return result;
        } catch (error) {
          if (isNearbyRead && awaiting.current) finish({ phase: 'error', message: parseApiError(error) });
          throw error;
        }
      },
    };
  }, [apollo, resultKey, finish]);

  const start = useCallback(
    (next: NearbySearch) => {
      startedAt.current = Date.now();
      clearTimeout(timer.current);
      const apply = (centre: Omit<LeadNear, 'radius_km'>) => {
        awaiting.current = true;
        setScan({ phase: 'searching' });
        setSearch(next);
        setNear({ ...centre, radius_km: next.radius_km });
      };
      if (next.source === 'place') {
        apply(next.area ? { city: next.city, area: next.area } : { city: next.city });
        return;
      }
      if (!('geolocation' in navigator)) {
        setScan({ phase: 'error', message: t('crm.nearby.geoUnsupported') });
        return;
      }
      setScan({ phase: 'locating' });
      navigator.geolocation.getCurrentPosition(
        (position) => apply({ lat: position.coords.latitude, lng: position.coords.longitude }),
        (error) =>
          setScan({
            phase: 'error',
            message: t(error.code === error.PERMISSION_DENIED ? 'crm.nearby.geoDenied' : 'crm.nearby.geoUnavailable'),
          }),
        GEO_OPTIONS
      );
    },
    [t]
  );

  const clear = useCallback(() => {
    awaiting.current = false;
    clearTimeout(timer.current);
    setNear(null);
    setSearch(null);
    setScan({ phase: 'idle' });
  }, []);

  return { near, search, scan, start, clear, client };
}

/** A lead table's `fetchRows` with Nearby leads built in: `near` is sent only while a nearby search is on. */
export function useLeadsTableFetch<Row>(query: unknown, resultKey: string): { fetchRows: TableFetch<Row>; nearby: NearbyLeads } {
  const nearby = useNearbyLeads(resultKey);
  const fetchRows = useApolloTableFetch<Row>(
    nearby.client,
    query,
    resultKey,
    { extraVariables: nearby.near ? { near: nearby.near } : undefined },
    [nearby.near]
  );
  return { fetchRows, nearby };
}
