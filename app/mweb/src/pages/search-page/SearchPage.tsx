import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Box, Container } from '@mui/material';
import SearchBar from './SearchBar';
import SearchResults from './SearchResults';
import CategoryActions from './CategoryActions';
import { useSearchDiscovery, useSearchCategories } from './useSearchDiscovery';
import { useFollowedClubs } from '../../hooks/useFollowedClubs';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { clubUrl, podUrl } from '../../utils/seoUrls';
import type { SearchSort } from './searchSort';

/** The full Home Page > Search experience: live suggestions, category quick
 * actions, club-grouped results (Happening This Week / More Clubs), sort & filter
 * and discovery-oriented empty states. Mirrors the native app's SearchScreen. */
export default function SearchPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [text, setText] = useState(() => params.get('q') ?? '');
  const [categoryId, setCategoryId] = useState('');
  const [sort, setSort] = useState<SearchSort>('RELEVANCE');

  const debounced = useDebouncedValue(text.trim());
  const { buttons, nameOf } = useSearchCategories();
  const { happening, moreClubs, loading, active, refetch } = useSearchDiscovery(debounced, categoryId);
  const follow = useFollowedClubs();

  useEffect(() => {
    setParams(debounced ? { q: debounced } : {}, { replace: true });
  }, [debounced, setParams]);

  const handleToggleFollow = async (clubId: string) => {
    try {
      await follow.toggle(clubId);
      if (active) await refetch();
    } catch {
      // The follow mutation surfaces its own error; nothing extra to do here.
    }
  };

  const pickCategory = (id: string) => {
    setCategoryId(id);
    setText('');
  };

  return (
    <Container maxWidth="md" sx={{ py: 2 }}>
      <Box sx={{ position: 'sticky', top: 0, zIndex: 4, pb: 1.5 }}>
        <SearchBar value={text} onChange={setText} onPick={setText} />
      </Box>
      {active ? (
        <SearchResults
          happening={happening}
          moreClubs={moreClubs}
          loading={loading}
          keyword={debounced}
          sort={sort}
          onSortChange={setSort}
          categories={buttons}
          categoryId={categoryId}
          onCategoryChange={setCategoryId}
          categoryNameOf={nameOf}
          isFollowing={follow.isFollowing}
          followBusy={follow.loading}
          onToggleFollow={handleToggleFollow}
          onOpenClub={(slug) => navigate(clubUrl(slug))}
          onOpenPod={(clubSlug, podSlug) => navigate(podUrl(clubSlug, podSlug))}
          onShareIdea={() => navigate('/pod-ideas')}
          onEarn={() => navigate('/earn')}
        />
      ) : (
        <CategoryActions categories={buttons} onSelect={pickCategory} />
      )}
    </Container>
  );
}
