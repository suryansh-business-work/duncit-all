import { Fragment } from 'react';
import { Text, YStack } from 'tamagui';

import { SearchClubCard } from './SearchClubCard';
import type { SearchClubResult } from '@/hooks/useSearch';

type SearchPod = SearchClubResult['upcoming_pods'][number];

interface Props {
  heading: string;
  subheading: string;
  results: SearchClubResult[];
  categoryNameOf: (club: SearchClubResult['club']) => string | null;
  onOpenClub: (clubSlug: string) => void;
  onOpenPod: (pod: SearchPod) => void;
  testID: string;
}

/** One titled result group ("Happening Soon" / "More Clubs") — club cards split
 * by an elegant dotted divider so clubs stay visually distinct. */
export function SearchResultsSection({
  heading,
  subheading,
  results,
  categoryNameOf,
  onOpenClub,
  onOpenPod,
  testID,
}: Readonly<Props>) {
  if (results.length === 0) return null;
  return (
    <YStack gap={14} testID={testID}>
      <YStack gap={2}>
        <Text fontSize={17} fontWeight="900" color="$color">
          {heading}
        </Text>
        <Text fontSize={13} color="$muted">
          {subheading}
        </Text>
      </YStack>
      {results.map((result, index) => (
        <Fragment key={result.club.id}>
          <SearchClubCard
            result={result}
            categoryName={categoryNameOf(result.club)}
            onOpenClub={onOpenClub}
            onOpenPod={onOpenPod}
          />
          {index < results.length - 1 ? (
            <YStack
              borderBottomWidth={1.5}
              borderColor="$borderColor"
              borderStyle="dotted"
              opacity={0.7}
            />
          ) : null}
        </Fragment>
      ))}
    </YStack>
  );
}
