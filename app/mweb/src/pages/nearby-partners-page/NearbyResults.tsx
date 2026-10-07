import { Alert, Stack, Typography } from '@mui/material';
import PersonSearchRoundedIcon from '@mui/icons-material/PersonSearchRounded';
import StorefrontRoundedIcon from '@mui/icons-material/StorefrontRounded';
import { DuncitButton } from '@duncit/buttons';
import { widerPodRequestRadius } from '@duncit/utils';
import { SearchingNearby } from '../../components/searching-nearby';
import { useTranslation } from '../../i18n/useTranslation';
import NearbyCard, { type NearbyItem } from './NearbyCard';
import type { NearbySearchState } from './useNearbySearch';

interface Props {
  /** What is being searched for. */
  kind: 'HOST' | 'VENUE';
  state: NearbySearchState;
  /** The search centre's name, for the radar's hint. */
  placeName: string;
  items: readonly NearbyItem[];
  loading: boolean;
  error: string | null;
  /** No requests left this month. */
  quotaReached: boolean;
  onRequest: (item: NearbyItem) => void;
}

/** The search's result area: the radar while looking, the cards, or the empty state with ways to widen it. */
export default function NearbyResults({ kind, state, placeName, items, loading, error, quotaReached, onRequest }: Readonly<Props>) {
  const { t } = useTranslation();
  const isHost = kind === 'HOST';
  const km = state.radiusKm;

  if (!state.locationId) {
    return (
      <Alert severity="info" data-testid="nearby-pick-location">
        {t('podRequests.pickLocation')}
      </Alert>
    );
  }
  if (loading) {
    return (
      <SearchingNearby
        title={isHost ? t('podRequests.searchingHosts') : t('podRequests.searchingVenues')}
        hint={t('podRequests.searchingHint', { vars: { km, place: placeName } })}
        icon={isHost ? <PersonSearchRoundedIcon /> : <StorefrontRoundedIcon />}
        testId="nearby-searching"
      />
    );
  }
  if (error) return <Alert severity="error">{error}</Alert>;
  if (items.length === 0) {
    const wider = widerPodRequestRadius(km);
    return (
      <Stack spacing={1.5} sx={{ alignItems: 'center', textAlign: 'center', py: 3 }} data-testid="nearby-empty">
        <Typography variant="body1" sx={{ fontWeight: 600 }}>
          {isHost
            ? t('podRequests.noHostsFound', { vars: { km } })
            : t('podRequests.noVenuesFound', { vars: { km } })}
        </Typography>
        <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap', justifyContent: 'center' }}>
          {wider !== null && (
            <DuncitButton variant="contained" onClick={() => state.setRadiusKm(wider)} data-testid="nearby-widen">
              {t('podRequests.expandSearch', { vars: { km: wider } })}
            </DuncitButton>
          )}
          {state.categoryIds.length > 0 && (
            <DuncitButton variant="outlined" onClick={() => state.setCategoryIds([])} data-testid="nearby-all-categories">
              {t('podRequests.tryAllCategories')}
            </DuncitButton>
          )}
        </Stack>
      </Stack>
    );
  }
  return (
    <Stack spacing={1.5} data-testid="nearby-results">
      {items.map((item) => (
        <NearbyCard key={item.id} item={item} disabled={quotaReached} onRequest={onRequest} />
      ))}
    </Stack>
  );
}
