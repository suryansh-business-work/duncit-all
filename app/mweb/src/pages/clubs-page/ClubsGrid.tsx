import { Box } from '@mui/material';
import ClubListCard from './ClubListCard';
import AdCard from '../../components/ads/AdCard';
import { interleaveAds, isAdEntry } from '../../components/ads/AdSlot';
import { useActiveAds } from '../../components/ads/useActiveAds';

const AD_EVERY_CLUBS = 6;

interface ClubsGridProps {
  clubs: any[];
  podCounts: Map<string, number>;
  onOpen: (club: any) => void;
}

/** The Clubs listing grid with a full-row sponsored banner woven in after
 * every 6 clubs (CLUB_LIST inventory; none → clubs only). */
export default function ClubsGrid({ clubs, podCounts, onOpen }: Readonly<ClubsGridProps>) {
  const { ads } = useActiveAds('CLUB_LIST');
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
        gap: 2,
      }}
    >
      {interleaveAds(clubs, ads, AD_EVERY_CLUBS).map((entry) => {
        if (isAdEntry(entry)) {
          return (
            <Box key={entry.__ad.id} sx={{ gridColumn: '1 / -1' }}>
              <AdCard ad={entry.__ad} />
            </Box>
          );
        }
        const club = entry;
        return (
          <ClubListCard
            key={club.id}
            club={club}
            podCount={podCounts.get(club.id) ?? 0}
            onOpen={() => onOpen(club)}
          />
        );
      })}
    </Box>
  );
}
