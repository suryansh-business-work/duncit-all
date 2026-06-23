import { Text, XStack, YStack } from 'tamagui';

/** Admin-authored club content as a bullet list (Who We Are, Perks, …). */
export function ClubBulletsSection({ title, items }: Readonly<{ title: string; items: string[] }>) {
  const bullets = items.filter((item) => item.trim().length > 0);
  if (bullets.length === 0) return null;
  return (
    <YStack gap={8} testID="club-bullets">
      <Text fontSize={16} fontWeight="900" color="$color">
        {title}
      </Text>
      {bullets.map((item) => (
        <XStack key={item} gap={8} alignItems="flex-start">
          <Text color="$primary" fontSize={14} fontWeight="900">
            •
          </Text>
          <Text flex={1} fontSize={14} color="$muted" lineHeight={20}>
            {item}
          </Text>
        </XStack>
      ))}
    </YStack>
  );
}
