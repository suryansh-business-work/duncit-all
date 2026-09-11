import { Text, XStack, YStack } from 'tamagui';

import { SectionHeader } from '@/components/SectionHeader';
import { SurfaceCard } from '@/components/SurfaceCard';

/** Admin-authored club content as a bullet list (Who We Are, Perks, …) on a
 * surface card. mWeb twin: club-details-page/ClubBulletsSection. */
export function ClubBulletsSection({ title, items }: Readonly<{ title: string; items: string[] }>) {
  const bullets = items.filter((item) => item.trim().length > 0);
  if (bullets.length === 0) return null;
  return (
    <SurfaceCard gap={8} testID="club-bullets">
      <SectionHeader title={title} />
      {bullets.map((item) => (
        <XStack key={item} gap={14} alignItems="flex-start" paddingVertical={4}>
          <YStack width={8} height={8} borderRadius={4} marginTop={6} backgroundColor="$accent" />
          <Text flex={1} fontSize={14} color="$color" lineHeight={20}>
            {item}
          </Text>
        </XStack>
      ))}
    </SurfaceCard>
  );
}
