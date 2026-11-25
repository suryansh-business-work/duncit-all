import { useCallback, useState } from 'react';
import * as Location from 'expo-location';
import type { NearbyLeadsValues } from '@duncit/forms/schemas';
import { logs } from '@duncit/logs';

import type { CrmLeadNearInput } from '@/generated/graphql/graphql';
import type { Translate } from '@/i18n/fallback';
import type { LeadListSummary } from './useLeadList';

/** Where a Nearby leads search stands, as its sheet shows it. */
export type NearbyScan =
  | { phase: 'idle' | 'locating' | 'searching' }
  | { phase: 'done'; total: number; unplaced: number | null }
  | { phase: 'error'; message: string };

interface NearbyState {
  near: CrmLeadNearInput | null;
  search: NearbyLeadsValues | null;
  phase: 'idle' | 'locating' | 'searching' | 'failed';
  /** The failure's copy key (location refused or not found). */
  messageKey: string;
  /** The listing's first-page count when the search began: its next first page is the answer. */
  fromSeq: number;
}

const IDLE: NearbyState = { near: null, search: null, phase: 'idle', messageKey: '', fromSeq: 0 };

/**
 * A listing's Nearby leads search (the portal's useNearbyLeads): around the
 * phone's position or a picked city (and area), within a radius. The listing
 * itself runs the nearby read, so the result is its own first page.
 */
export function useNearbySearch() {
  const [state, setState] = useState<NearbyState>(IDLE);

  const start = useCallback(async (values: NearbyLeadsValues, currentSeq: number) => {
    const searching = (centre: Omit<CrmLeadNearInput, 'radius_km'>) =>
      setState({
        near: { ...centre, radius_km: values.radius_km },
        search: values,
        phase: 'searching',
        messageKey: '',
        fromSeq: currentSeq,
      });
    if (values.source === 'place') {
      searching(values.area ? { city: values.city, area: values.area } : { city: values.city });
      return;
    }
    setState((prev) => ({ ...prev, phase: 'locating', messageKey: '' }));
    const fail = (messageKey: string) =>
      setState((prev) => ({ ...prev, phase: 'failed', messageKey }));
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        fail('crmApp.leadList.geoDenied');
        return;
      }
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      searching({ lat: position.coords.latitude, lng: position.coords.longitude });
    } catch (error) {
      logs.mobileApp.warn('crm-app/useNearbySearch', 'locate', { error });
      fail('crm.nearby.geoUnavailable');
    }
  }, []);

  const clear = useCallback(() => setState(IDLE), []);

  /** The scan as of the listing's latest first page. */
  const scanOf = useCallback(
    (summary: LeadListSummary, listError: string | null, t: Translate): NearbyScan => {
      if (state.phase === 'failed') return { phase: 'error', message: t(state.messageKey) };
      if (state.phase !== 'searching') return { phase: state.phase };
      if (summary.seq <= state.fromSeq || !summary.nearby) return { phase: 'searching' };
      if (summary.failed)
        return { phase: 'error', message: listError ?? t('crmApp.common.loadFailed') };
      return { phase: 'done', total: summary.total, unplaced: summary.unplaced };
    },
    [state],
  );

  return { near: state.near, search: state.search, start, clear, scanOf };
}
