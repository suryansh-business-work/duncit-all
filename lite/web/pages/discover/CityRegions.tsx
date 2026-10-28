import { useMemo } from 'react';
import { Link as RouterLink } from 'react-router';
import { Avatar, Box, Link, Stack, Typography } from '@mui/material';
import LocationCityOutlinedIcon from '@mui/icons-material/LocationCityOutlined';
import { DuncitTabs, tabPanelProps, useTabParam, type DuncitTabItem } from '@duncit/tabs';
import type { LiteCity, LiteCityRegion } from '../../../shared/graphql/documents';
import { useWebT } from '../../../shared/i18n';
import { tintAt } from '../../../shared/tokens';
import { paths } from '../../lib/paths';

/** The tab order of "Explore local events"; a region with no city is left out. */
export const REGION_ORDER: readonly LiteCityRegion[] = ['ASIA_PACIFIC', 'EUROPE', 'AFRICA', 'NORTH_AMERICA', 'SOUTH_AMERICA'];
const TABS_ID = 'discover-regions';
export const CITY_GRID = { display: 'grid', gap: 2, gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' } } as const;

function CityLink({ city, position }: Readonly<{ city: LiteCity; position: number }>) {
  const { t } = useWebT();
  return (
    <Link component={RouterLink} to={paths.city(city.slug)} underline="none" color="inherit" sx={{ display: 'block', borderRadius: 1, p: 0.5, '&:hover': { bgcolor: 'action.hover' } }} data-testid={`city-${city.slug}`}>
      <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', minWidth: 0 }}>
        <Avatar src={city.cover_url ?? undefined} alt="" sx={{ width: 36, height: 36, bgcolor: tintAt(position) }}>
          <LocationCityOutlinedIcon fontSize="small" />
        </Avatar>
        <Stack sx={{ minWidth: 0 }}>
          <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>
            {city.name}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {t('liteWeb.discover.eventsCount', { count: city.events_count })}
          </Typography>
        </Stack>
      </Stack>
    </Link>
  );
}

/** Cities grouped by region, one tab per region, the choice kept in the URL (`?region=`). */
export function CityRegions({ cities }: Readonly<{ cities: readonly LiteCity[] }>) {
  const { t } = useWebT();
  const present = useMemo(() => REGION_ORDER.filter((region) => cities.some((city) => city.region === region)), [cities]);
  const items = useMemo<DuncitTabItem<LiteCityRegion>[]>(
    () => present.map((region) => ({ value: region, label: t(`liteWeb.discover.regions.${region}`), testId: `region-${region}` })),
    [present, t],
  );
  const tabs = useTabParam<LiteCityRegion>({ items, fallback: present[0] ?? 'ASIA_PACIFIC', param: 'region' });
  if (present.length === 0) return null;
  const shown = cities.filter((city) => city.region === tabs.value);
  return (
    <Stack spacing={2}>
      {present.length > 1 ? <DuncitTabs {...tabs} idPrefix={TABS_ID} searchable={false} variant="scrollable" allowScrollButtonsMobile /> : null}
      <Box {...tabPanelProps(TABS_ID, tabs.value)} sx={CITY_GRID}>
        {shown.map((city, index) => (
          <CityLink key={city.id} city={city} position={index} />
        ))}
        {shown.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            {t('liteWeb.discover.noCities')}
          </Typography>
        ) : null}
      </Box>
    </Stack>
  );
}
