import { useState } from 'react';
import { Stack, Typography } from '@mui/material';
import { parseApiError } from '@duncit/utils';
import LocationChangeBar from '../../components/LocationChangeBar';
import { notifySuccess } from '../../components/notify';
import { useAutoPodCityLabel } from '../../hooks/useAutoPodCityLabel';
import { useTranslation } from '../../i18n/useTranslation';
import type { NearbyItem } from './NearbyCard';
import NearbyResults from './NearbyResults';
import SearchFilters from './SearchFilters';
import { RequestPodDialog } from './request-pod-form';
import type { PodRequestQuota } from './queries';
import type { NearbySearchState } from './useNearbySearch';

interface Props {
  /** What is being searched for. */
  kind: 'HOST' | 'VENUE';
  state: NearbySearchState;
  items: readonly NearbyItem[];
  loading: boolean;
  error: string | null;
  quota: PodRequestQuota | null;
  sending: boolean;
  /** Sends the request; throws with the server's refusal. */
  send: (item: NearbyItem, note: string) => Promise<unknown>;
}

/**
 * Everything under a nearby search's header: where it searches from (the
 * header's location, changeable in place), the filters, this month's
 * allowance, the results and the Request Pod dialog.
 */
export default function NearbySearchBody({ kind, state, items, loading, error, quota, sending, send }: Readonly<Props>) {
  const { t } = useTranslation();
  const [target, setTarget] = useState<NearbyItem | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const cityName = useAutoPodCityLabel(state.locationId) ?? '';
  const placeName = [state.zoneName, cityName].filter(Boolean).join(', ');
  const quotaReached = quota !== null && quota.remaining <= 0;

  const submit = async (note: string) => {
    if (!target) return false;
    setSendError(null);
    try {
      await send(target, note);
      notifySuccess(t('podRequests.requestSent'));
      setTarget(null);
      return true;
    } catch (err) {
      setSendError(parseApiError(err));
      return false;
    }
  };

  return (
    <Stack spacing={2}>
      <LocationChangeBar
        testId="nearby-location"
        label={placeName || t('podRequests.pickLocation')}
        changeLabel={t('mweb.autoPods.changeLocation')}
        ariaLabel={t('mweb.appHeader.changeCityOrZone')}
      />
      <SearchFilters state={state} />
      {quota && (
        <Typography
          variant="body2"
          sx={{ color: quotaReached ? 'error.main' : 'text.secondary', fontWeight: 600 }}
          data-testid="nearby-quota"
        >
          {quotaReached
            ? t('podRequests.quotaReached', { vars: { limit: quota.limit } })
            : t('podRequests.quotaLeft', { vars: { remaining: quota.remaining, limit: quota.limit } })}
        </Typography>
      )}
      <NearbyResults
        kind={kind}
        state={state}
        placeName={placeName}
        items={items}
        loading={loading}
        error={error}
        quotaReached={quotaReached}
        onRequest={(item) => {
          setSendError(null);
          setTarget(item);
        }}
      />
      <RequestPodDialog
        targetName={target?.name ?? null}
        sending={sending}
        error={sendError}
        onClose={() => setTarget(null)}
        onSubmit={submit}
      />
    </Stack>
  );
}
