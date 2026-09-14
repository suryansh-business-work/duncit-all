import { AdCard } from '@/components/ads/AdCard';
import { ClubCard } from '@/components/home/ClubCard';
import { ClubCityCard } from '@/components/home/ClubCityCard';
import type { ClubsFeedEntry } from '@/components/home/clubs-feed';
import { SectionHeader } from '@/components/SectionHeader';

interface Props {
  entry: ClubsFeedEntry;
  podCounts: ReadonlyMap<string, number>;
  onOpenCity: (locationId: string) => void;
  onOpenClub: (clubSlug?: string | null) => void;
}

/** Renders one Clubs tab row by its kind. */
export function ClubsFeedRow({ entry, podCounts, onOpenCity, onOpenClub }: Readonly<Props>) {
  switch (entry.kind) {
    case 'city':
      return (
        <ClubCityCard group={entry.group} onPress={() => onOpenCity(entry.group.locationId)} />
      );
    case 'locality':
      return <SectionHeader testID="clubs-locality-heading" title={entry.title} />;
    case 'ad':
      return <AdCard ad={entry.ad} variant="banner" />;
    default:
      return (
        <ClubCard
          club={entry.club}
          podCount={podCounts.get(entry.club.id) ?? 0}
          onPress={() => onOpenClub(entry.club.club_id)}
        />
      );
  }
}
