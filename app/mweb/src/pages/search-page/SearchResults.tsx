import { useState } from 'react';
import { Box, CircularProgress, Stack } from '@mui/material';
import SortIcon from '@mui/icons-material/SwapVert';
import FilterIcon from '@mui/icons-material/TuneOutlined';
import { DuncitButton } from '@duncit/buttons';
import SearchResultsSection from './SearchResultsSection';
import SearchSortMenu from './SearchSortMenu';
import SearchFilterSheet from './SearchFilterSheet';
import SearchEmptyState from './SearchEmptyState';
import { sortClubResults, type SearchSort } from './searchSort';
import type { SearchCategory } from './useSearchDiscovery';
import { useTranslation } from '../../i18n/useTranslation';

/** A 40px pill on the page ground: surface at rest; the Filter pill turns
 * green while a category is applied. Explicit min-height keeps the
 * coarse-pointer 44px rule from stretching it. */
const PILL_SX = {
  height: 40,
  minHeight: 40,
  px: 2,
  bgcolor: 'background.paper',
  color: 'text.primary',
  border: '1px solid var(--duncit-card-border)',
  '&:hover': { bgcolor: 'background.paper' },
} as const;
const ACTIVE_PILL_SX = { height: 40, minHeight: 40, px: 2 } as const;

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
  const { t } = useTranslation();
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
        <DuncitButton startIcon={<SortIcon />} onClick={() => setSortOpen(true)} sx={PILL_SX}>
          Sort
        </DuncitButton>
        <DuncitButton
          variant={categoryId ? 'contained' : 'text'}
          startIcon={<FilterIcon />}
          onClick={() => setFilterOpen(true)}
          sx={categoryId ? ACTIVE_PILL_SX : PILL_SX}
        >
          Filter
        </DuncitButton>
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
        heading={t('mweb.search.exploreExperiencesHappeningSoon')}
        results={sortClubResults(happening, sort)}
        {...sectionProps}
      />
      <SearchResultsSection
        heading={t('mweb.search.moreClubsWorthExploring')}
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
