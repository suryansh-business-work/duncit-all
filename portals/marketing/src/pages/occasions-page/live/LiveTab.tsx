import { useQuery } from '@apollo/client/react';
import { Alert, LinearProgress, Stack } from '@mui/material';
import { SectionCard } from '@duncit/ui';
import { parseApiError } from '@duncit/utils';
import { useTranslation } from '@duncit/app-settings';
import { OCCASION_LIVE, OCCASION_THEMES, type OccasionLiveData, type OccasionThemesData } from '../queries';
import { LiveModeForm, type LiveModeFormValues } from '../live-mode-form';
import LiveHero from './LiveHero';
import { useSetLiveMode } from './useSetLiveMode';

/**
 * Occasions → Live: what every app wears now, and the switch that decides it —
 * the house look, one pinned look, or whichever look's dates are open.
 */
export default function LiveTab() {
  const { t } = useTranslation();
  const live = useQuery<OccasionLiveData>(OCCASION_LIVE, { fetchPolicy: 'cache-and-network' });
  const themes = useQuery<OccasionThemesData>(OCCASION_THEMES, { fetchPolicy: 'cache-and-network' });
  const { setLiveMode } = useSetLiveMode();
  const data = live.data;
  const looks = (themes.data?.occasionThemes ?? []).filter((look) => !look.is_archived);

  const save = (values: LiveModeFormValues) =>
    setLiveMode(
      values.mode,
      looks.find((look) => look.key === values.manual_key),
    );

  return (
    <Stack spacing={3} data-testid="occasions-live">
      {(live.loading || themes.loading) && !data && <LinearProgress />}
      {live.error && <Alert severity="error">{parseApiError(live.error)}</Alert>}
      {themes.error && <Alert severity="error">{parseApiError(themes.error)}</Alert>}
      {data && <LiveHero live={data.occasionLive} />}
      {data && themes.data && (
        <SectionCard title={t('marketing.occasions.live.modeTitle')} subtitle={t('marketing.occasions.live.modeSubtitle')}>
          <LiveModeForm
            // Saved values come back through the refetch; a fresh form starts clean from them.
            key={`${data.occasionSettings.mode}:${data.occasionSettings.manual_key}`}
            settings={data.occasionSettings}
            looks={looks}
            onSubmit={save}
          />
        </SectionCard>
      )}
    </Stack>
  );
}
