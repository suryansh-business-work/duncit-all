import { YStack } from 'tamagui';

import { SectionHeader } from '@/components/SectionHeader';
import { SearchClubCard } from './SearchClubCard';
import type { SearchClubResult } from '@/hooks/useSearch';

type SearchPod = SearchClubResult['upcoming_pods'][number];

interface Props {
  heading: string;
  /** Kept for callers; sections carry their title alone. */
  subheading?: string;
  results: SearchClubResult[];
  categoryNameOf: (club: SearchClubResult['club']) => string | null;
  onOpenClub: (clubSlug: string) => void;
  onOpenPod: (pod: SearchPod) => void;
  testID: string;
}

/** One titled result group ("Happening Soon" / "More Clubs") — each club its
 * own surface card, so clubs stay distinct without dividers. */
export function SearchResultsSection({
  heading,
  results,
  categoryNameOf,
  onOpenClub,
  onOpenPod,
  testID,
}: Readonly<Props>) {
  if (results.length === 0) return null;
  return (
    <YStack gap={12} testID={testID}>
      <SectionHeader title={heading} />
      {results.map((result) => (
        <SearchClubCard
          key={result.club.id}
          result={result}
          categoryName={categoryNameOf(result.club)}
          onOpenClub={onOpenClub}
          onOpenPod={onOpenPod}
        />
      ))}
    </YStack>
  );
}
