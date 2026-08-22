import { useState } from 'react';
import { ScrollView, Text, XStack, YStack } from 'tamagui';

import { CategoryLevel, GiftCardScopeType } from '@/generated/graphql/graphql';
import type { GiftCardCategory } from '@/hooks/useGiftCards';
import { useTranslation } from '@/hooks/useTranslation';
import { GiftCardVisual } from './GiftCardVisual';

/** One pickable theme — SHOP, or one category of the group's level. */
export interface GiftCardThemeChoice {
  scope_type: GiftCardScopeType;
  scope_category_id: string | null;
  scope_name: string;
  scope_image_url: string;
  /** The category's uploaded card faces; empty keeps the gradient card. */
  scope_image_front_url: string;
  scope_image_back_url: string;
}

interface Props {
  categories: readonly GiftCardCategory[];
  value: GiftCardThemeChoice | null;
  onChange: (choice: GiftCardThemeChoice) => void;
}

/** Group chip → the category level whose cards it lists (SHOP lists none). */
const GROUP_LEVEL: Partial<Record<GiftCardScopeType, CategoryLevel>> = {
  [GiftCardScopeType.Super]: CategoryLevel.Super,
  [GiftCardScopeType.Category]: CategoryLevel.Category,
  [GiftCardScopeType.Sub]: CategoryLevel.Sub,
};

/** Group chip labels (full literal keys — never composed). */
const GROUPS: readonly { scope: GiftCardScopeType; labelKey: string }[] = [
  { scope: GiftCardScopeType.Shop, labelKey: 'mweb.giftCards.themeShop' },
  { scope: GiftCardScopeType.Super, labelKey: 'mweb.giftCards.themeSuper' },
  { scope: GiftCardScopeType.Category, labelKey: 'mweb.giftCards.themeCategory' },
  { scope: GiftCardScopeType.Sub, labelKey: 'mweb.giftCards.themeSub' },
];

const SHOP_CHOICE: GiftCardThemeChoice = {
  scope_type: GiftCardScopeType.Shop,
  scope_category_id: null,
  scope_name: '',
  scope_image_url: '',
  scope_image_front_url: '',
  scope_image_back_url: '',
};

const CARD_WIDTH = 210;

/** The theme step of the buy page: Shop/Super/Category/Sub group chips over a
 * rail of gradient theme cards. Twin of mWeb's theme picker (rule 27). */
export function GiftCardThemePicker({ categories, value, onChange }: Readonly<Props>) {
  const { t } = useTranslation();
  const [group, setGroup] = useState<GiftCardScopeType>(GiftCardScopeType.Shop);

  const level = GROUP_LEVEL[group];
  let choices: GiftCardThemeChoice[];
  if (level) {
    choices = categories
      .filter((cat) => cat.level === level)
      .map((cat) => ({
        scope_type: group,
        scope_category_id: cat.id,
        scope_name: cat.name,
        scope_image_url: cat.icon ?? '',
        scope_image_front_url: cat.gift_card_image_front,
        scope_image_back_url: cat.gift_card_image_back,
      }));
  } else {
    choices = [SHOP_CHOICE];
  }

  return (
    <YStack gap={10}>
      <Text fontSize={15} fontWeight="700" color="$color">
        {t('mweb.giftCards.themeHeading')}
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8 }}
      >
        {GROUPS.map(({ scope, labelKey }) => {
          const isActive = group === scope;
          const label = t(labelKey);
          return (
            <XStack
              key={scope}
              testID={`gift-card-group-${scope}`}
              role="button"
              aria-label={label}
              onPress={() => setGroup(scope)}
              paddingHorizontal={14}
              paddingVertical={8}
              borderRadius={999}
              borderWidth={1}
              borderColor={isActive ? '$primary' : '$borderColor'}
              backgroundColor={isActive ? '$primary' : 'transparent'}
              pressStyle={{ opacity: 0.8 }}
            >
              <Text fontSize={13} fontWeight="700" color={isActive ? '$onPrimary' : '$color'}>
                {label}
              </Text>
            </XStack>
          );
        })}
      </ScrollView>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 10 }}
      >
        {choices.map((choice) => {
          const key = choice.scope_category_id ?? choice.scope_type;
          const isSelected =
            value?.scope_type === choice.scope_type &&
            value?.scope_category_id === choice.scope_category_id;
          const caption =
            choice.scope_type === GiftCardScopeType.Shop
              ? t('mweb.giftCards.shopThemeCaption')
              : undefined;
          return (
            <YStack
              key={key}
              testID={`gift-card-theme-${key}`}
              role="button"
              aria-label={choice.scope_name || t('mweb.giftCards.shopTheme')}
              onPress={() => onChange(choice)}
              width={CARD_WIDTH}
              borderRadius={18}
              borderWidth={2}
              borderColor={isSelected ? '$primary' : 'transparent'}
              padding={2}
              pressStyle={{ opacity: 0.85 }}
            >
              <GiftCardVisual
                compact
                theme={choice}
                imageUrl={choice.scope_image_url}
                artworkFrontUrl={choice.scope_image_front_url}
                artworkBackUrl={choice.scope_image_back_url}
                caption={caption}
              />
            </YStack>
          );
        })}
      </ScrollView>
    </YStack>
  );
}
