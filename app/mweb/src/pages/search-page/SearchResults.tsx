import { useState } from 'react';
import { Box, Button, CircularProgress, Stack } from '@mui/material';
import SortIcon from '@mui/icons-material/SwapVert';
import FilterIcon from '@mui/icons-material/TuneOutlined';
import SearchResultsSection from './SearchResultsSection';
import SearchSortMenu from './SearchSortMenu';
import SearchFilterSheet from './SearchFilterSheet';
import SearchEmptyState from './SearchEmptyState';
import { sortClubResults, type SearchSort } from './searchSort';
import type { SearchCategory } from './useSearchDiscovery';

interface ClubResult {
  is_following: boolean;
  participant_count: number;
  next_pod_date?: string | null;
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
  happening: ClubResult[];
  moreClubs: ClubResult[];
  loading: boolean;
  keyword: string;
  sort: SearchSort;
  onSortChange: (next: SearchSort) => void;
  categories: SearchCategory[];
  categoryId: string;
  onCategoryChange: (next: string) => void;
  categoryNameOf: (club: ClubResult['club']) => string | null;
  isFollowing: (clubId: string) => boolean;
  followBusy: boolean;
  onToggleFollow: (clubId: string) => void;
  onOpenClub: (clubId: string) => void;
  onOpenPod: (clubSlug: string, podSlug: string) => void;
  onShareIdea: () => void;
  onEarn: () => void;
}

export default function SearchResults({
  happening,
  moreClubs,
  loading,
  keyword,
  sort,
  onSortChange,
  categories,
  categoryId,
  onCategoryChange,
  categoryNameOf,
  isFollowing,
  followBusy,
  onToggleFollow,
  onOpenClub,
  onOpenPod,
  onShareIdea,
  onEarn,
}: Readonly<Props>) {
  const [sortOpen, setSortOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const isEmpty = happening.length === 0 && moreClubs.length === 0;

  const sectionProps = {
    categoryNameOf,
    isFollowing,
    followBusy,
    onToggleFollow,
    onOpenClub,
    onOpenPod,
  };

  return (
    <Stack spacing={2.5}>
      <Stack direction="row" spacing={1}>
        <Button
          variant="outlined"
          color="inherit"
          startIcon={<SortIcon />}
          onClick={() => setSortOpen(true)}
          sx={{ fontWeight: 800, borderRadius: 999 }}
        >
          Sort
        </Button>
        <Button
          variant={categoryId ? 'contained' : 'outlined'}
          color={categoryId ? 'primary' : 'inherit'}
          startIcon={<FilterIcon />}
          onClick={() => setFilterOpen(true)}
          sx={{ fontWeight: 800, borderRadius: 999 }}
        >
          Filter
        </Button>
      </Stack>

      {loading && isEmpty ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : null}

      {!loading && isEmpty ? (
        <SearchEmptyState
          variant={categoryId ? 'empty-category' : 'no-results'}
          keyword={keyword}
          onShareIdea={onShareIdea}
          onEarn={onEarn}
          onExploreCategories={() => onCategoryChange('')}
        />
      ) : null}

      <SearchResultsSection
        heading="🔥 Explore Experiences Happening Soon"
        subheading="Find clubs hosting exciting experiences you can join this week."
        results={sortClubResults(happening, sort)}
        {...sectionProps}
      />
      <SearchResultsSection
        heading="✨ More Clubs Worth Exploring"
        subheading="Discover communities that match your interests and start your next experience."
        results={sortClubResults(moreClubs, sort)}
        {...sectionProps}
      />

      <SearchSortMenu open={sortOpen} value={sort} onClose={() => setSortOpen(false)} onSelect={onSortChange} />
      <SearchFilterSheet
        open={filterOpen}
        categories={categories}
        categoryId={categoryId}
        onClose={() => setFilterOpen(false)}
        onSelect={onCategoryChange}
      />
    </Stack>
  );
}
