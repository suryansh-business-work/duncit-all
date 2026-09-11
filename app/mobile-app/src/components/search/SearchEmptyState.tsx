import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { PressScale } from '@/animations/PressScale';
import { EmptyState } from '@/components/EmptyState';
import { SurfaceCard } from '@/components/SurfaceCard';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';

type Glyph = keyof typeof MaterialIcons.glyphMap;

interface CtaBlockProps {
  icon: Glyph;
  title: string;
  cta: string;
  testID: string;
  onPress: () => void;
}

/** A single call-to-action card: an accent icon on a soft disc, the title and
 * a green pill — the title and the CTA say it all. Hoisted (no nested component). */
function CtaBlock({ icon, title, cta, testID, onPress }: Readonly<CtaBlockProps>) {
  const { accent } = useThemeColors();
  return (
    <SurfaceCard gap={12}>
      <XStack alignItems="center" gap={12}>
        <YStack
          width={40}
          height={40}
          borderRadius={20}
          backgroundColor="$soft"
          alignItems="center"
          justifyContent="center"
        >
          <MaterialIcons name={icon} size={20} color={accent} />
        </YStack>
        <Text flex={1} fontSize={16} fontWeight="600" color="$color">
          {title}
        </Text>
      </XStack>
      <PressScale testID={testID} accessibilityLabel={cta} onPress={onPress}>
        <XStack
          alignSelf="flex-start"
          height={44}
          paddingHorizontal={20}
          borderRadius={999}
          backgroundColor="$primary"
          alignItems="center"
        >
          <Text fontSize={14} fontWeight="600" color="$onPrimary">
            {cta}
          </Text>
        </XStack>
      </PressScale>
    </SurfaceCard>
  );
}

interface Props {
  variant: 'no-results' | 'empty-category';
  /** Kept for the callers; the one-line empty state no longer echoes it. */
  keyword?: string;
  onShareIdea: () => void;
  onEarn: () => void;
  onExploreCategories: () => void;
}

export function SearchEmptyState({
  variant,
  onShareIdea,
  onEarn,
  onExploreCategories,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const isCategory = variant === 'empty-category';
  const heading = isCategory ? 'Nothing Here Yet' : 'No Pods Match Your Search';

  return (
    <YStack gap={12} testID="search-empty-state">
      <EmptyState icon="search-off" title={heading} testID="search-empty-state-message" />

      <CtaBlock
        icon="lightbulb-outline"
        title="Didn't Find What You Were Looking For?"
        cta="Share a Pod Idea"
        testID="search-cta-idea"
        onPress={onShareIdea}
      />

      {isCategory ? (
        <CtaBlock
          icon="explore"
          title={t('mweb.search.exploreOtherInterests')}
          cta="Explore More Categories"
          testID="search-cta-explore"
          onPress={onExploreCategories}
        />
      ) : (
        <CtaBlock
          icon="storefront"
          title={t('mweb.search.turnYourPassionIntoSomethingBigger')}
          cta="Earn With Duncit"
          testID="search-cta-earn"
          onPress={onEarn}
        />
      )}
    </YStack>
  );
}
