import { useMemo } from 'react';
import { Box, Stack } from '@mui/material';
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined';
import {
  clubCityName,
  groupClubsByCity,
  groupClubsByLocality,
  type ClubCityLocation,
} from '@duncit/utils';
import EmptyState from '../../components/EmptyState';
import SectionHeader from '../../components/SectionHeader';
import ClubCityCard from './ClubCityCard';
import ClubsGrid, { CLUBS_GRID_SX } from './ClubsGrid';
import { useTranslation } from '../../i18n/useTranslation';

interface Props {
  /** Already searched, filtered and sorted. */
  clubs: any[];
  locations: readonly ClubCityLocation[];
  podCounts: Map<string, number>;
  /** '' lists the city cards; a Location id lists that city's clubs by locality. */
  activeCityId: string;
  /** Present when the city was opened from the city cards — shows the way back. */
  onBack?: () => void;
  onOpenCity: (locationId: string) => void;
  onOpenClub: (club: any) => void;
}

/** The Clubs list grouped by place: city cards first, then — inside a city —
 * a section per locality. Native twin: ClubsScreen + home/clubs-feed. */
export default function ClubsGroupedBody({
  clubs,
  locations,
  podCounts,
  activeCityId,
  onBack,
  onOpenCity,
  onOpenClub,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const cities = useMemo(
    () => (activeCityId ? [] : groupClubsByCity(clubs, locations)),
    [activeCityId, clubs, locations],
  );
  const localities = useMemo(
    () =>
      activeCityId
        ? groupClubsByLocality(clubs.filter((club) => club.location_id === activeCityId))
        : [],
    [activeCityId, clubs],
  );
  const openCity = onBack ? locations.find((location) => location.id === activeCityId) : undefined;
  const isEmpty = cities.length === 0 && localities.length === 0;

  return (
    <Stack spacing={2}>
      {openCity && (
        <SectionHeader
          testId="clubs-city-heading"
          title={clubCityName(openCity)}
          actionLabel={t('mweb.clubsPage.allCities')}
          onAction={onBack}
        />
      )}
      {isEmpty && (
        <EmptyState testId="clubs-list-empty" icon={<GroupsOutlinedIcon />} title={t('mweb.clubsPage.noClubsFound')} />
      )}
      {cities.length > 0 && (
        <Box data-testid="clubs-city-grid" sx={CLUBS_GRID_SX}>
          {cities.map((group) => (
            <ClubCityCard key={group.locationId} group={group} onOpen={() => onOpenCity(group.locationId)} />
          ))}
        </Box>
      )}
      {localities.map(({ locality, clubs: grouped }) => (
        <Stack key={locality || 'other-areas'} spacing={1.25}>
          <SectionHeader testId="clubs-locality-heading" title={locality || t('mweb.clubsPage.otherAreas')} />
          <ClubsGrid clubs={grouped} podCounts={podCounts} onOpen={onOpenClub} />
        </Stack>
      ))}
    </Stack>
  );
}
