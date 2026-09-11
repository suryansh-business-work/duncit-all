import { Stack } from '@mui/material';
import SectionHeader from '../../components/SectionHeader';
import SearchClubCard from './SearchClubCard';

interface ClubResult {
  is_following: boolean;
  participant_count: number;
  club: {
    id: string;
    club_id: string;
    club_name: string;
    club_description?: string | null;
    followers_count: number;
    category_id?: string | null;
    super_category_id?: string | null;
    club_feature_images_and_videos?: { url: string }[];
  };
  upcoming_pods: any[];
}

interface Props {
  heading: string;
  /** Kept for callers; sections carry their title alone. */
  subheading?: string;
  results: ClubResult[];
  categoryNameOf: (club: ClubResult['club']) => string | null;
  isFollowing: (clubId: string) => boolean;
  followBusy: boolean;
  onToggleFollow: (clubId: string) => void;
  onOpenClub: (clubId: string) => void;
  onOpenPod: (clubSlug: string, podSlug: string) => void;
}

/** One titled result group ("Happening Soon" / "More Clubs") — each club its
 * own surface card, so clubs stay distinct without dividers. */
export default function SearchResultsSection({
  heading,
  results,
  categoryNameOf,
  isFollowing,
  followBusy,
  onToggleFollow,
  onOpenClub,
  onOpenPod,
}: Readonly<Props>) {
  if (results.length === 0) return null;
  return (
    <Stack component="section" spacing={1.5}>
      <SectionHeader title={heading} />
      {results.map((result) => (
        <SearchClubCard
          key={result.club.id}
          result={result}
          categoryName={categoryNameOf(result.club)}
          following={isFollowing(result.club.id)}
          followBusy={followBusy}
          onToggleFollow={onToggleFollow}
          onOpenClub={onOpenClub}
          onOpenPod={onOpenPod}
        />
      ))}
    </Stack>
  );
}
