import { ScrollView, Share } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack, useTheme } from 'tamagui';
import { fireAndForget, logs } from '@duncit/logs';

import { RADII } from '@/constants/design';
import { useTranslation } from '@/hooks/useTranslation';

export interface ChipItem {
  slug: string;
  label?: string;
}

interface Props {
  title?: string;
  items: readonly ChipItem[];
  /** Slugs declared on the template (selected). */
  declared: ReadonlySet<string>;
  onToggle: (slug: string) => void;
  /** When set, a chip is red if its slug is not offered for the template (the "Detected" row). */
  knownSlugs?: ReadonlySet<string>;
  emptyHint: string;
  testID: string;
}

/** Hand text (a `{{ slug }}`, an image URL) to the phone's share sheet, from where it can be copied. */
export const shareText = (message: string) =>
  fireAndForget(Share.share({ message }), logs.mobileApp, 'crm-app/EmailTemplateEditor', 'share');

/** Declared chips are filled; only placeholders the audience does not offer are red. */
function chipLook(selected: boolean, foreign: boolean) {
  if (foreign) return { border: '$danger', ink: '$danger' } as const;
  if (selected) return { border: '$primary', ink: '$onPrimary' } as const;
  return { border: '$inputBorder', ink: '$color' } as const;
}

interface ChipProps {
  item: ChipItem;
  selected: boolean;
  foreign: boolean;
  onToggle: (slug: string) => void;
  testID: string;
}

function VariableChip({ item, selected, foreign, onToggle, testID }: Readonly<ChipProps>) {
  const { t } = useTranslation();
  const theme = useTheme();
  const look = chipLook(selected, foreign);
  const text = item.label ? `${item.label} · ${item.slug}` : item.slug;
  const selectedTip = selected
    ? t('crm.emailTemplates.inTemplateTip')
    : t('crm.emailTemplates.notInTemplateTip');
  return (
    <XStack
      role="button"
      aria-pressed={selected}
      aria-label={text}
      accessibilityHint={foreign ? t('crm.emailTemplates.foreignVariableTip') : selectedTip}
      onPress={() => onToggle(item.slug)}
      alignItems="center"
      gap="$2"
      minHeight={36}
      paddingLeft="$3"
      paddingRight="$2"
      borderRadius={RADII.pill}
      borderWidth={1}
      borderColor={look.border}
      backgroundColor={selected ? '$primary' : 'transparent'}
      testID={testID}
    >
      <Text color={look.ink} fontSize="$2" fontWeight="600">
        {text}
      </Text>
      <YStack
        role="button"
        aria-label={t('crmApp.emailTemplates.shareVariable', { vars: { key: item.slug } })}
        onPress={() => shareText(`{{ ${item.slug} }}`)}
        hitSlop={14}
        testID={`${testID}-share`}
      >
        <MaterialIcons
          name="share"
          size={16}
          color={selected ? theme.onPrimary?.val : theme.muted?.val}
        />
      </YStack>
    </XStack>
  );
}

/**
 * A row of variable chips, as the portal's. Tap a chip to add it to the
 * template or take it off; its share icon hands out `{{ slug }}`.
 */
export function VariableChips({
  title,
  items,
  declared,
  onToggle,
  knownSlugs,
  emptyHint,
  testID,
}: Readonly<Props>) {
  return (
    <YStack gap="$2">
      {title ? (
        <Text fontWeight="700" role="heading">
          {title}
        </Text>
      ) : null}
      {items.length === 0 ? (
        <Text color="$muted" fontSize="$2">
          {emptyHint}
        </Text>
      ) : null}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <XStack gap="$2">
          {items.map((item) => (
            <VariableChip
              key={item.slug}
              item={item}
              selected={declared.has(item.slug)}
              foreign={knownSlugs ? !knownSlugs.has(item.slug) : false}
              onToggle={onToggle}
              testID={`${testID}-${item.slug}`}
            />
          ))}
        </XStack>
      </ScrollView>
    </YStack>
  );
}
