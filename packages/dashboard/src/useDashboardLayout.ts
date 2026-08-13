import { useCallback, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import {
  MY_DASHBOARD_LAYOUT,
  RESET_DASHBOARD_LAYOUT,
  SAVE_DASHBOARD_LAYOUT,
  type DashboardLayoutDto,
} from './queries';
import { clearCachedLayout, readCachedLayout, writeCachedLayout } from './persistence';
import type { DashboardLayoutItem } from './types';

export interface DashboardLayoutState {
  /**
   * The user's stored slots, or null while still unknown. An empty array means
   * "asked, and they have never customised this dashboard" — the caller then
   * renders its defaults.
   */
  saved: DashboardLayoutItem[] | null;
  /** True once there is something to paint: the local cache or the server's answer. */
  ready: boolean;
  saving: boolean;
  /** The layout query failed — the caller falls back to defaults and says so. */
  loadFailed: boolean;
  save: (items: readonly DashboardLayoutItem[]) => Promise<void>;
  reset: () => Promise<void>;
}

const fromDto = (dto: DashboardLayoutDto | null | undefined): DashboardLayoutItem[] =>
  (dto?.items ?? []).map((item) => ({
    id: item.widget_id,
    x: item.x,
    y: item.y,
    w: item.w,
    h: item.h,
  }));

const toDto = (items: readonly DashboardLayoutItem[]) =>
  items.map((item) => ({ widget_id: item.id, x: item.x, y: item.y, w: item.w, h: item.h }));

/**
 * One dashboard's saved arrangement, read from the server and mirrored in
 * localStorage.
 *
 * The mirror is what stops the "default layout for half a second, then jump"
 * flash on every page load: the grid mounts against the cached slots, and the
 * server's answer — authoritative, because the user may have rearranged this
 * dashboard on another machine — replaces them when it lands.
 */
export function useDashboardLayout(dashboardId: string): DashboardLayoutState {
  const cached = useMemo(() => readCachedLayout(dashboardId), [dashboardId]);
  const [pending, setPending] = useState<DashboardLayoutItem[] | null>(null);

  const { data, error, refetch } = useQuery<{ myDashboardLayout: DashboardLayoutDto | null }>(
    MY_DASHBOARD_LAYOUT,
    { variables: { dashboard_id: dashboardId }, fetchPolicy: 'cache-and-network' }
  );

  const [runSave, saveState] = useMutation(SAVE_DASHBOARD_LAYOUT);
  const [runReset, resetState] = useMutation(RESET_DASHBOARD_LAYOUT);

  // Memoised because callers key effects off this array's identity: rebuilding
  // it on every render would re-run the grid's layout pass on every render.
  const saved = useMemo(() => {
    // What this session last wrote outranks a server answer that predates it.
    if (pending) return pending;
    return data ? fromDto(data.myDashboardLayout) : cached;
  }, [pending, data, cached]);

  const save = useCallback(
    async (items: readonly DashboardLayoutItem[]) => {
      const next = [...items];
      setPending(next);
      writeCachedLayout(dashboardId, next);
      await runSave({
        variables: { dashboard_id: dashboardId, items: toDto(next) },
        // `DashboardLayout` has no id, so Apollo cannot normalise the payload
        // into `myDashboardLayout(dashboard_id:…)` on its own — without this a
        // remount replays the pre-save cache entry for one network round-trip.
        update: (cache, { data: resp }) => {
          const layout = (resp as { saveDashboardLayout?: DashboardLayoutDto } | null | undefined)
            ?.saveDashboardLayout;
          if (!layout) return;
          cache.writeQuery({
            query: MY_DASHBOARD_LAYOUT,
            variables: { dashboard_id: dashboardId },
            data: { myDashboardLayout: layout },
          });
        },
      });
    },
    [dashboardId, runSave]
  );

  const reset = useCallback(async () => {
    setPending([]);
    clearCachedLayout(dashboardId);
    await runReset({ variables: { dashboard_id: dashboardId } });
    await refetch();
  }, [dashboardId, runReset, refetch]);

  return {
    saved,
    ready: !!data || !!error || !!cached,
    saving: saveState.loading || resetState.loading,
    loadFailed: !!error,
    save,
    reset,
  };
}
