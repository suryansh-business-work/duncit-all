import { AppImage } from '@/components/AppImage';

import { ScrollView, Text, YStack } from 'tamagui';

import type { ClubMoment } from '@/utils/club-detail';

/** Random sample of the club's pods' media — horizontal Club Moments rail. */
export function ClubMomentsRail({ moments }: Readonly<{ moments: ClubMoment[] }>) {
  if (moments.length === 0) return null;
  return (
    <YStack gap={8} testID="club-moments">
      <Text fontSize={16} fontWeight="900" color="$color">
        Club Moments
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 10 }}
      >
        {moments.map((moment, i) => (
          <AppImage
            key={`${i}-${moment.url}`}
            source={{ uri: moment.url }}
            style={{ width: 120, height: 150, borderRadius: 14 }}
            resizeMode="cover"
          />
        ))}
      </ScrollView>
    </YStack>
  );
}
