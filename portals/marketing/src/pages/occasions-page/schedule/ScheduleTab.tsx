import { useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router';
import { useMutation, useQuery } from '@apollo/client/react';
import { Alert, Box, LinearProgress, Stack } from '@mui/material';
import type { MutationSetOccasionScheduleArgs, OccasionScheduleInput, OccasionTheme } from '@duncit/gql-types';
import { DuncitButton } from '@duncit/buttons';
import { notify } from '@duncit/dialogs';
import { TAB_PARAM } from '@duncit/tabs';
import { parseApiError } from '@duncit/utils';
import { useDateFormat, useTranslation } from '@duncit/app-settings';
import { LIVE_MODE_LABEL } from '../copy';
import {
  OCCASION_LIVE,
  OCCASION_REFRESH,
  OCCASION_THEMES,
  SET_OCCASION_SCHEDULE,
  type OccasionLiveData,
  type OccasionThemesData,
} from '../queries';
import { usePreviewMode } from '../preview/usePreviewMode';
import { ScheduleForm } from '../schedule-form';
import ScheduleItem from './ScheduleItem';
import { scheduleRows } from './scheduleOrder';

/**
 * Occasions → Schedule: every look's date window, what is on now and what is
 * next first. Dates only switch a look on while the live mode is Automatic.
 */
export default function ScheduleTab() {
  const { t } = useTranslation();
  const { now } = useDateFormat();
  const [mode] = usePreviewMode();
  const themes = useQuery<OccasionThemesData>(OCCASION_THEMES, { fetchPolicy: 'cache-and-network' });
  const live = useQuery<OccasionLiveData>(OCCASION_LIVE, { fetchPolicy: 'cache-and-network' });
  const [saveMut] = useMutation<unknown, MutationSetOccasionScheduleArgs>(SET_OCCASION_SCHEDULE, {
    refetchQueries: OCCASION_REFRESH,
    awaitRefetchQueries: true,
  });
  const [editing, setEditing] = useState<OccasionTheme | null>(null);
  const all = themes.data?.occasionThemes;
  const rows = useMemo(() => scheduleRows(all ?? [], now()), [all, now]);
  const liveMode = live.data?.occasionSettings.mode;

  const save = async (key: string, input: OccasionScheduleInput) => {
    try {
      await saveMut({ variables: { key, input } });
      notify(t('marketing.occasions.schedule.saved'), 'success');
      return true;
    } catch (err) {
      notify(parseApiError(err), 'error');
      return false;
    }
  };

  return (
    <Stack spacing={2.5} data-testid="occasions-schedule">
      <Alert
        severity={liveMode === 'SCHEDULE' ? 'success' : 'info'}
        action={
          liveMode !== 'SCHEDULE' && (
            <DuncitButton color="inherit" size="small" component={RouterLink} to={`/occasions?${TAB_PARAM}=live`}>
              {t('marketing.occasions.schedule.changeMode')}
            </DuncitButton>
          )
        }
      >
        {t('marketing.occasions.schedule.explain')}{' '}
        {liveMode && t('marketing.occasions.schedule.modeNow', { vars: { mode: t(LIVE_MODE_LABEL[liveMode]) } })}
      </Alert>
      {themes.loading && !all && <LinearProgress />}
      {themes.error && <Alert severity="error">{parseApiError(themes.error)}</Alert>}
      {all && rows.length === 0 && (
        <Alert severity="info" variant="outlined">
          {t('marketing.occasions.schedule.empty')}
        </Alert>
      )}
      <Box component="ol" sx={{ m: 0, p: 0, display: 'grid', gap: 1.5 }} aria-label={t('marketing.occasions.schedule.listLabel')}>
        {rows.map((row) => (
          <ScheduleItem key={row.look.key} look={row.look} state={row.state} mode={mode} onEdit={setEditing} />
        ))}
      </Box>
      <ScheduleForm look={editing} onClose={() => setEditing(null)} onSubmit={save} />
    </Stack>
  );
}
