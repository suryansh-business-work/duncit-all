import { Fragment } from 'react';
import { Box, Divider, Stack, Typography } from '@mui/material';
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
  subheading: string;
  results: ClubResult[];
  categoryNameOf: (club: ClubResult['club']) => string | null;
  isFollowing: (clubId: string) => boolean;
  followBusy: boolean;
  onToggleFollow: (clubId: string) => void;
  onOpenClub: (clubId: string) => void;
  onOpenPod: (clubSlug: string, podSlug: string) => void;
}

export default function SearchResultsSection({
  heading,
  subheading,
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
    <Box component="section">
      <Typography variant="h6" fontWeight={900} sx={{ lineHeight: 1.2 }}>
        {heading}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {subheading}
      </Typography>
      <Stack spacing={2}>
        {results.map((result, index) => (
          <Fragment key={result.club.id}>
            <SearchClubCard
              result={result}
              categoryName={categoryNameOf(result.club)}
              following={isFollowing(result.club.id)}
              followBusy={followBusy}
              onToggleFollow={onToggleFollow}
              onOpenClub={onOpenClub}
              onOpenPod={onOpenPod}
            />
            {index < results.length - 1 && (
              <Divider sx={{ borderStyle: 'dotted', borderColor: 'divider', borderBottomWidth: 2 }} />
            )}
          </Fragment>
        ))}
      </Stack>
    </Box>
  );
}
