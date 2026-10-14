import { Spinner, Text, XStack, YStack } from 'tamagui';
import type { FoodChipColor } from '@duncit/utils';

import { DuncitButton } from '@/components/DuncitButton';
import { useTranslation } from '@/hooks/useTranslation';

/** The shared chip palette as theme tokens — the colour and its soft fill, legible in both themes. */
const CHIP_TOKENS: Readonly<Record<FoodChipColor, { color: string; fill: string }>> = {
  default: { color: '$muted', fill: '$soft' },
  primary: { color: '$accent', fill: '$primarySoft' },
  info: { color: '$accent', fill: '$primarySoft' },
  success: { color: '$success', fill: '$successSoft' },
  warning: { color: '$warning', fill: '$soft' },
  error: { color: '$danger', fill: '$dangerSoft' },
};

/** A status chip in the colour @duncit/utils gives the status — the twin of MUI's StatusChip on the web. */
export function FoodChip({
  label,
  color,
  testID,
}: Readonly<{ label: string; color: FoodChipColor; testID?: string }>) {
  const { color: text, fill } = CHIP_TOKENS[color];
  return (
    <XStack
      testID={testID}
      borderRadius={999}
      paddingHorizontal={10}
      paddingVertical={4}
      backgroundColor={fill}
      alignSelf="flex-start"
    >
      <Text fontSize={11} fontWeight="600" color={text}>
        {label}
      </Text>
    </XStack>
  );
}

/** One labelled bar: a status's share of the orders, or a dish against the best seller. */
export function FoodBar({
  label,
  figure,
  percent,
  testID,
}: Readonly<{ label: string; figure: string; percent: number; testID?: string }>) {
  const { t } = useTranslation();
  return (
    <YStack
      gap={4}
      testID={testID}
      role="img"
      aria-label={t('venueFoodOwner.dashboard.statusShare', {
        vars: { status: label, count: figure },
      })}
    >
      <XStack justifyContent="space-between" gap={8}>
        <Text flex={1} fontSize={12} fontWeight="700" color="$color" numberOfLines={1}>
          {label}
        </Text>
        <Text fontSize={12} color="$muted">
          {figure}
        </Text>
      </XStack>
      <YStack height={8} borderRadius={999} backgroundColor="$soft" overflow="hidden">
        <YStack height={8} width={`${percent}%`} borderRadius={999} backgroundColor="$primary" />
      </YStack>
    </YStack>
  );
}

interface ListStateProps {
  isLoading: boolean;
  error: string | null;
  empty: boolean;
  emptyText: string;
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
  testID: string;
}

/** What a food list shows around its rows: the first load, a failed one, nothing yet, and "Load more". */
export function FoodListState({
  isLoading,
  error,
  empty,
  emptyText,
  hasMore,
  loadingMore,
  onLoadMore,
  testID,
}: Readonly<ListStateProps>) {
  const { t } = useTranslation();
  return (
    <>
      {isLoading && empty ? (
        <Spinner
          role="progressbar"
          aria-label={t('venueFoodOwner.common.loading')}
          color="$primary"
        />
      ) : null}
      {error ? (
        <Text role="alert" testID={`${testID}-error`} fontSize={13} color="$danger">
          {error}
        </Text>
      ) : null}
      {!isLoading && !error && empty ? (
        <Text role="status" testID={`${testID}-empty`} fontSize={14} color="$muted">
          {emptyText}
        </Text>
      ) : null}
      {hasMore ? (
        <DuncitButton
          testID={`${testID}-more`}
          label={t('venueFoodOwner.common.loadMore')}
          variant="ghost"
          loading={loadingMore}
          disabled={loadingMore}
          onPress={onLoadMore}
        />
      ) : null}
    </>
  );
}
