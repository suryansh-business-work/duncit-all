import { Box, MenuItem, Stack, TextField, Typography } from '@mui/material';
import EventIcon from '@mui/icons-material/Event';
import PlaceIcon from '@mui/icons-material/Place';
import { useTranslation } from '@duncit/app-settings';
import { AdminCategorySelect, type AdminCategoryValue } from '@duncit/category';
import { POD_LIFECYCLE_OPTIONS, type PodLifecycleFilter } from './podLifecycle';
import { clubLocationLabel, type PodFilterClub, type PodFilterLocation } from './podListFilters';

interface Props {
  clubs: PodFilterClub[];
  locations: PodFilterLocation[];
  clubFilter: string;
  setClubFilter: (id: string) => void;
  lifecycle: PodLifecycleFilter;
  setLifecycle: (lifecycle: PodLifecycleFilter) => void;
  category: AdminCategoryValue;
  setCategory: (value: AdminCategoryValue) => void;
}

/** "Who Even Are We? | (pin) Gomti Nagar, Lucknow" — the club and where it
 * runs. The pin is an icon, not a glyph (rule 31); hoisted to module scope. */
function ClubOptionLabel({ name, location }: Readonly<{ name: string; location: string }>) {
  if (!location) return <>{name}</>;
  return (
    <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
      {name}
      {' | '}
      <PlaceIcon fontSize="inherit" aria-hidden />
      {location}
    </Box>
  );
}

export default function PodsToolbar({
  clubs,
  locations,
  clubFilter,
  setClubFilter,
  lifecycle,
  setLifecycle,
  category,
  setCategory,
}: Readonly<Props>) {
  const { t } = useTranslation();

  return (
    <Stack
      direction={{ xs: 'column', lg: 'row' }}
      spacing={2}
      sx={{
        justifyContent: "space-between",
        alignItems: { xs: 'flex-start', lg: 'center' }
      }}>
      <Box>
        <Stack direction="row" spacing={1} sx={{
          alignItems: "center"
        }}>
          <EventIcon color="primary" />
          <Typography variant="h5" component="h1">Pods</Typography>
        </Stack>
        <Typography variant="body2" sx={{
          color: "text.secondary"
        }}>
          Events organised inside a club. Hosts are attendees by default.
        </Typography>
      </Box>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        useFlexGap
        sx={{ flexWrap: 'wrap', alignItems: { sm: 'flex-start' } }}
      >
        <TextField
          size="small"
          select
          label={t('admin.filters.podLifecycle')}
          value={lifecycle}
          onChange={(e) => setLifecycle(e.target.value as PodLifecycleFilter)}
          sx={{ minWidth: 180 }}
        >
          {POD_LIFECYCLE_OPTIONS.map((option) => (
            <MenuItem key={option.labelKey} value={option.value}>
              {t(option.labelKey)}
            </MenuItem>
          ))}
        </TextField>
        {/* A pod's category is its club's, so these three narrow the table to
            the clubs in that category. Strict: each level waits for its parent. */}
        <Box sx={{ width: { xs: '100%', sm: 560 } }}>
          <AdminCategorySelect
            value={category}
            onChange={setCategory}
            strict
            direction={{ xs: 'column', sm: 'row' }}
            labels={{
              super: t('admin.filters.superCategory'),
              category: t('admin.filters.category'),
              sub: t('admin.filters.subCategory'),
            }}
          />
        </Box>
        <TextField
          size="small"
          select
          label={t('admin.pods.colClub')}
          value={clubFilter}
          onChange={(e) => setClubFilter(e.target.value)}
          sx={{ minWidth: 200 }}
        >
          <MenuItem value="">{t('admin.pods.allClubs')}</MenuItem>
          {clubs.map((c) => (
            <MenuItem key={c.id} value={c.id}>
              <ClubOptionLabel name={c.club_name} location={clubLocationLabel(c, locations)} />
            </MenuItem>
          ))}
        </TextField>
      </Stack>
    </Stack>
  );
}
