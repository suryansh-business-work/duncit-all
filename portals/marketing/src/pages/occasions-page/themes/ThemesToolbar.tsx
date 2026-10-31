import { Link as RouterLink } from 'react-router';
import { Chip, FormControlLabel, InputAdornment, Stack, Switch, TextField } from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/app-settings';
import { REGIONS, REGION_LABEL } from '../copy';
import type { RegionFilter, ThemeFilters } from './filterThemes';

interface Props {
  filters: ThemeFilters;
  onChange: (next: ThemeFilters) => void;
}

const ALL_REGIONS: readonly RegionFilter[] = ['ALL', ...REGIONS];

/** Search, a region filter, the archived switch and the way to start a new look. */
export default function ThemesToolbar({ filters, onChange }: Readonly<Props>) {
  const { t } = useTranslation();
  const regionLabel = (region: RegionFilter) => (region === 'ALL' ? t('marketing.occasions.themes.allRegions') : t(REGION_LABEL[region]));

  return (
    <Stack spacing={1.5}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ alignItems: { sm: 'center' } }}>
        <TextField
          size="small"
          value={filters.search}
          onChange={(event) => onChange({ ...filters, search: event.target.value })}
          label={t('marketing.occasions.themes.search')}
          sx={{ flex: 1, maxWidth: (th) => th.spacing(50) }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchRoundedIcon fontSize="small" />
                </InputAdornment>
              ),
            },
          }}
        />
        <FormControlLabel
          control={<Switch checked={filters.showArchived} onChange={(_, on) => onChange({ ...filters, showArchived: on })} />}
          label={t('marketing.occasions.themes.showArchived')}
        />
        <Stack sx={{ flex: 1 }} />
        <DuncitButton variant="contained" component={RouterLink} to="/occasions/themes/new" startIcon={<AddRoundedIcon />}>
          {t('marketing.occasions.themes.newLook')}
        </DuncitButton>
      </Stack>
      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', rowGap: 1 }} role="group" aria-label={t('marketing.occasions.themes.regionFilter')}>
        {ALL_REGIONS.map((region) => {
          const selected = filters.region === region;
          return (
            <Chip
              key={region}
              label={regionLabel(region)}
              color={selected ? 'primary' : 'default'}
              variant={selected ? 'filled' : 'outlined'}
              onClick={() => onChange({ ...filters, region })}
              aria-pressed={selected}
            />
          );
        })}
      </Stack>
    </Stack>
  );
}
