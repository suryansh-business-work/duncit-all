import { Box, Checkbox, FormControl, FormControlLabel, FormHelperText, FormLabel } from '@mui/material';
import type { AnalyticsEntity } from '@duncit/gql-types';
import { useTranslation } from '@duncit/app-settings';
import { ANALYTICS_PAGES } from '../../entity-analytics/pages';

interface Props {
  value: AnalyticsEntity[];
  onChange: (next: AnalyticsEntity[]) => void;
  error?: string;
}

/**
 * Which dashboards a report covers — every page in the console, named as the
 * sidebar names them, with "All dashboards" to tick or clear the lot. The order
 * ticked does not matter: a report always follows the sidebar's order.
 */
export default function DashboardPicker({ value, onChange, error }: Readonly<Props>) {
  const { t } = useTranslation();
  const chosen = new Set(value);
  const everything = ANALYTICS_PAGES.length === chosen.size;
  const some = chosen.size > 0 && !everything;
  const toggle = (entity: AnalyticsEntity, on: boolean) => {
    const next = new Set(chosen);
    if (on) next.add(entity);
    else next.delete(entity);
    onChange(ANALYTICS_PAGES.map((page) => page.entity).filter((entity) => next.has(entity)));
  };

  return (
    <FormControl component="fieldset" error={Boolean(error)} data-testid="analytics-mail-dashboards">
      <FormLabel component="legend">{t('analytics.mails.dashboards')}</FormLabel>
      <FormControlLabel
        control={
          <Checkbox
            checked={everything}
            indeterminate={some}
            onChange={(event) => onChange(event.target.checked ? ANALYTICS_PAGES.map((page) => page.entity) : [])}
          />
        }
        label={t('analytics.mails.allDashboards')}
      />
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, pl: { xs: 0, sm: 2 } }}>
        {ANALYTICS_PAGES.map((page) => (
          <FormControlLabel
            key={page.entity}
            control={
              <Checkbox
                checked={chosen.has(page.entity)}
                onChange={(event) => toggle(page.entity, event.target.checked)}
                slotProps={{ input: { 'aria-describedby': error ? 'analytics-mail-dashboards-error' : undefined } }}
              />
            }
            label={t(page.title)}
          />
        ))}
      </Box>
      {error && <FormHelperText id="analytics-mail-dashboards-error">{error}</FormHelperText>}
    </FormControl>
  );
}
