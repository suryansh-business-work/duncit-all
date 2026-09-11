import type { ReactNode } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Spinner, Text, XStack, YStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';
import { PRESS_STYLE } from '@duncit/buttons-native';

interface PodSaveButtonProps {
  podId: string;
  saved: boolean;
  saving: boolean;
  label: string;
  onPress: () => void;
}

/** The 36px round save button over the image — the bookmark the pod details
 * screen uses, and a spinner in its place while the toggle is in flight. */
export function PodSaveButton({
  podId,
  saved,
  saving,
  label,
  onPress,
}: Readonly<PodSaveButtonProps>) {
  const { accent } = useThemeColors();
  const icon = (
    <MaterialIcons name={saved ? 'bookmark' : 'bookmark-border'} size={18} color={accent} />
  );
  return (
    <XStack
      testID={`pod-card-save-${podId}`}
      role="button"
      aria-label={label}
      aria-pressed={saved}
      // Ignored while in flight so a double tap cannot un-save what the first
      // tap is still saving.
      onPress={saving ? undefined : onPress}
      position="absolute"
      top={6}
      right={6}
      width={36}
      height={36}
      borderRadius={18}
      alignItems="center"
      justifyContent="center"
      backgroundColor="$surface"
      pressStyle={PRESS_STYLE.control}
    >
      {saving ? <Spinner size="small" color={accent} /> : icon}
    </XStack>
  );
}

interface ImagePillProps {
  children: ReactNode;
  /** Top-left (the date, 26 tall) or, when omitted, bottom-left (the category, 24). */
  top?: number;
  maxWidth: number;
}

/** A small surface pill over the image — the date and the category. */
export function ImagePill({ children, top, maxWidth }: Readonly<ImagePillProps>) {
  const atTop = top !== undefined;
  return (
    <XStack
      position="absolute"
      top={top}
      bottom={atTop ? undefined : 8}
      left={8}
      maxWidth={maxWidth}
      alignItems="center"
      gap={4}
      height={atTop ? 26 : 24}
      paddingHorizontal={10}
      borderRadius={999}
      backgroundColor="$surface"
    >
      {children}
    </XStack>
  );
}

interface PodCardInfoProps {
  title: string;
  price: string;
  /** "N joining now"; empty when nobody has booked yet. */
  joiningText: string;
  spotsText: string;
  /** The place line; empty hides it. */
  subText: string;
}

/** The text under the image: who is coming, the title (always two lines tall,
 * so every card in a rail keeps the same image height) with the price beside
 * it, then the place. mWeb twin: home-page/PodCardInfo. */
export function PodCardInfo({
  title,
  price,
  joiningText,
  spotsText,
  subText,
}: Readonly<PodCardInfoProps>) {
  const { muted } = useThemeColors();
  return (
    <YStack paddingTop={10} paddingHorizontal={4} paddingBottom={2} gap={4}>
      <XStack alignItems="center" gap={4}>
        <MaterialIcons name="group" size={14} color={muted} />
        <Text
          flex={1}
          fontSize={12}
          lineHeight={16}
          fontWeight="500"
          color="$muted"
          numberOfLines={1}
        >
          {joiningText ? (
            <Text color="$success" fontWeight="600">
              {`${joiningText} · `}
            </Text>
          ) : null}
          {spotsText}
        </Text>
      </XStack>
      <XStack alignItems="flex-start" gap={8}>
        <Text
          flex={1}
          minHeight={40}
          fontSize={16}
          lineHeight={20}
          fontWeight="600"
          color="$color"
          numberOfLines={2}
        >
          {title}
        </Text>
        <Text fontSize={18} lineHeight={22} fontWeight="700" color="$color">
          {price}
        </Text>
      </XStack>
      {subText ? (
        <Text fontSize={12} lineHeight={16} fontWeight="500" color="$muted" numberOfLines={1}>
          {subText}
        </Text>
      ) : null}
    </YStack>
  );
}
