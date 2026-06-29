import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { PressScale } from '@/animations/PressScale';
import { useThemeColors } from '@/hooks/useThemeColors';

type Glyph = keyof typeof MaterialIcons.glyphMap;

interface CtaBlockProps {
  icon: Glyph;
  title: string;
  description: string;
  cta: string;
  testID: string;
  onPress: () => void;
}

/** A single call-to-action card — hoisted to module scope (no nested component). */
function CtaBlock({ icon, title, description, cta, testID, onPress }: Readonly<CtaBlockProps>) {
  const { primary, onPrimary } = useThemeColors();
  return (
    <YStack
      gap={8}
      padding={16}
      borderRadius={16}
      borderWidth={1}
      borderColor="$borderColor"
      backgroundColor="$surface"
    >
      <XStack alignItems="center" gap={8}>
        <MaterialIcons name={icon} size={20} color={primary} />
        <Text fontSize={15} fontWeight="900" color="$color">
          {title}
        </Text>
      </XStack>
      <Text fontSize={13} color="$muted">
        {description}
      </Text>
      <PressScale testID={testID} accessibilityLabel={cta} onPress={onPress}>
        <XStack
          alignSelf="flex-start"
          height={40}
          paddingHorizontal={18}
          borderRadius={999}
          backgroundColor="$primary"
          alignItems="center"
        >
          <Text fontSize={14} fontWeight="900" color={onPrimary}>
            {cta}
          </Text>
        </XStack>
      </PressScale>
    </YStack>
  );
}

interface Props {
  variant: 'no-results' | 'empty-category';
  keyword: string;
  onShareIdea: () => void;
  onEarn: () => void;
  onExploreCategories: () => void;
}

export function SearchEmptyState({
  variant,
  keyword,
  onShareIdea,
  onEarn,
  onExploreCategories,
}: Readonly<Props>) {
  const { muted } = useThemeColors();
  const isCategory = variant === 'empty-category';
  const heading = isCategory ? 'Nothing Here Yet' : 'No Pods Match Your Search';
  const description = isCategory
    ? 'Looks like this category is just getting started. Explore other interests or share your own Pod idea to help grow the community.'
    : `We couldn't find any Pods, Clubs or experiences matching “${keyword}”. But don't let your curiosity stop here — you can inspire the next experience with Duncit.`;

  return (
    <YStack gap={16} testID="search-empty-state">
      <YStack alignItems="center" gap={8} paddingVertical={8}>
        <MaterialIcons name="search-off" size={48} color={muted} />
        <Text fontSize={17} fontWeight="900" color="$color" textAlign="center">
          {heading}
        </Text>
        <Text fontSize={13} color="$muted" textAlign="center">
          {description}
        </Text>
      </YStack>

      <CtaBlock
        icon="lightbulb-outline"
        title="Didn't Find What You Were Looking For?"
        description="Great communities are built around great ideas. Share the Pod you'd love to attend, and we'll explore bringing it to life with our growing community."
        cta="Share a Pod Idea"
        testID="search-cta-idea"
        onPress={onShareIdea}
      />

      {isCategory ? (
        <CtaBlock
          icon="explore"
          title="Explore Other Interests"
          description="Browse the full set of categories and discover communities that match what you love."
          cta="Explore More Categories"
          testID="search-cta-explore"
          onPress={onExploreCategories}
        />
      ) : (
        <CtaBlock
          icon="storefront"
          title="Turn Your Passion Into Something Bigger"
          description="If the experience you're searching for doesn't exist yet, why not create it? Host experiences, register your venue or list your products and start earning with Duncit."
          cta="Earn With Duncit"
          testID="search-cta-earn"
          onPress={onEarn}
        />
      )}
    </YStack>
  );
}
