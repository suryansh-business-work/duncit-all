import { useDeferredValue, useId, useMemo, useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { Alert, Box, Grid, LinearProgress, Stack, Typography } from '@mui/material';
import type { OccasionRegion, OccasionTheme } from '@duncit/gql-types';
import { parseApiError } from '@duncit/utils';
import { useTranslation } from '@duncit/app-settings';
import { REGION_LABEL } from '../copy';
import { OCCASION_LIVE, OCCASION_THEMES, type OccasionLiveData, type OccasionThemesData } from '../queries';
import PreviewDialog from '../preview/PreviewDialog';
import { usePreviewMode } from '../preview/usePreviewMode';
import type { PreviewMode } from '../preview/palette';
import { DuplicateLookForm } from '../duplicate-look-form';
import { groupThemes, type ThemeFilters } from './filterThemes';
import ThemeCard, { type ThemeCardHandlers } from './ThemeCard';
import ThemesToolbar from './ThemesToolbar';
import { useThemeActions } from './useThemeActions';

interface GroupProps extends ThemeCardHandlers {
  region: OccasionRegion;
  looks: OccasionTheme[];
  liveKey: string | null;
  mode: PreviewMode;
}

/** One region's looks under its heading, as a responsive grid of cards. */
function RegionGroup({ region, looks, liveKey, mode, ...handlers }: Readonly<GroupProps>) {
  const { t } = useTranslation();
  const headingId = useId();
  return (
    <Box component="section" aria-labelledby={headingId}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'baseline', mb: 1.5 }}>
        <Typography id={headingId} variant="h6" component="h2" sx={{ fontWeight: 700 }}>
          {t(REGION_LABEL[region])}
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {t('marketing.occasions.themes.count', { count: looks.length })}
        </Typography>
      </Stack>
      <Grid container spacing={2.5}>
        {looks.map((look) => (
          <Grid key={look.key} size={{ xs: 12, sm: 6, lg: 4, xl: 3 }}>
            <ThemeCard look={look} live={look.key === liveKey} mode={mode} {...handlers} />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}

/**
 * Occasions → Looks: every festival look, grouped by region, each card showing
 * a phone wearing it. Preview, edit, apply, copy, archive, reset or delete.
 */
export default function ThemesTab() {
  const { t } = useTranslation();
  const [mode] = usePreviewMode();
  const [filters, setFilters] = useState<ThemeFilters>({ search: '', region: 'ALL', showArchived: false });
  const deferred = useDeferredValue(filters);
  const themes = useQuery<OccasionThemesData>(OCCASION_THEMES, { fetchPolicy: 'cache-and-network' });
  const live = useQuery<OccasionLiveData>(OCCASION_LIVE, { fetchPolicy: 'cache-and-network' });
  const actions = useThemeActions();
  const [previewing, setPreviewing] = useState<OccasionTheme | null>(null);
  const [copying, setCopying] = useState<OccasionTheme | null>(null);
  const all = themes.data?.occasionThemes;
  const groups = useMemo(() => groupThemes(all ?? [], deferred), [all, deferred]);
  const liveKey = live.data?.occasionLive.theme?.key ?? null;

  const handlers: ThemeCardHandlers = {
    onPreview: setPreviewing,
    onApply: actions.apply,
    onDuplicate: setCopying,
    onArchive: actions.archive,
    onReset: actions.reset,
    onDelete: actions.remove,
  };

  return (
    <Stack spacing={3} data-testid="occasions-themes">
      <ThemesToolbar filters={filters} onChange={setFilters} />
      {themes.loading && !all && <LinearProgress />}
      {themes.error && <Alert severity="error">{parseApiError(themes.error)}</Alert>}
      {all && groups.length === 0 && (
        <Alert severity="info" variant="outlined">
          {t('marketing.occasions.themes.empty')}
        </Alert>
      )}
      {groups.map((group) => (
        <RegionGroup key={group.region} region={group.region} looks={group.looks} liveKey={liveKey} mode={mode} {...handlers} />
      ))}
      <PreviewDialog look={previewing} onClose={() => setPreviewing(null)} />
      <DuplicateLookForm
        look={copying}
        onClose={() => setCopying(null)}
        onSubmit={(name) => (copying ? actions.duplicate(copying, name) : Promise.resolve(false))}
      />
    </Stack>
  );
}
