import { useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import type { EarningsBucket, EarningsBucketKey, EarningsSplit } from '@duncit/utils';
import { PRESS_STYLE } from '@duncit/buttons-native';

type IconName = keyof typeof MaterialIcons.glyphMap;

const BUCKET_ICON: Record<EarningsBucketKey, IconName> = {
  venue: 'storefront',
  club: 'groups',
  duncit: 'account-balance',
  host: 'account-balance-wallet',
};

interface Props {
  split: EarningsSplit;
  money: (value: number) => string;
  /** The pod cannot cover the venue's slot price — flag the venue row. */
  venueShortfall: boolean;
}

/** Step 4's simplified money view: the total collection split four ways —
 * the host's own earning first and strongest, then where the rest goes (venue,
 * club admin, Duncit & govt). Every row starts collapsed and opens its own
 * breakdown, so the host reads the numbers first and the arithmetic only on
 * demand. mWeb twin. */
export function EarningsSplitAccordion({ split, money, venueShortfall }: Readonly<Props>) {
  const { t } = useTranslation();
  const [host, ...rest] = split.buckets;
  return (
    <YStack testID="price-panel-split" gap={8}>
      {host ? <BucketRow bucket={host} money={money} invalid={false} /> : null}
      <Text fontSize={13} fontWeight="600" color="$muted" marginTop={4}>
        {t('earnings.split.heading')}
      </Text>
      {rest.map((bucket) => (
        <BucketRow
          key={bucket.key}
          bucket={bucket}
          money={money}
          invalid={bucket.key === 'venue' && venueShortfall}
        />
      ))}
      {split.reconciled ? null : (
        <Text testID="price-panel-reconcile-warning" fontSize={12} color="$danger">
          {t('earnings.split.reconcileWarning')}
        </Text>
      )}
    </YStack>
  );
}

function BucketRow({
  bucket,
  money,
  invalid,
}: Readonly<{ bucket: EarningsBucket; money: (n: number) => string; invalid: boolean }>) {
  const { t } = useTranslation();
  const { muted, primary, success } = useThemeColors();
  const [open, setOpen] = useState(false);
  const isHost = bucket.key === 'host';
  const accent = isHost ? success : primary;
  return (
    <YStack
      borderRadius={16}
      overflow="hidden"
      backgroundColor={isHost ? '$successSoft' : '$soft'}
      borderWidth={invalid || isHost ? 1.5 : 1}
      borderColor={rowBorder(invalid, isHost)}
    >
      <XStack
        testID={`price-panel-split-${bucket.key}`}
        tabIndex={0}
        role="button"
        aria-label={bucket.title}
        aria-expanded={open}
        onPress={() => setOpen((value) => !value)}
        alignItems="center"
        gap={10}
        paddingHorizontal={12}
        paddingVertical={isHost ? 16 : 12}
        pressStyle={PRESS_STYLE.control}
      >
        <MaterialIcons name={BUCKET_ICON[bucket.key]} size={isHost ? 24 : 20} color={accent} />
        <YStack flex={1} minWidth={0}>
          <Text fontSize={isHost ? 16 : 14} fontWeight={isHost ? '700' : '600'} color="$color">
            {bucket.title}
          </Text>
          <Text fontSize={12} color="$muted">
            {t('earnings.split.shareOfCollection', { vars: { pct: bucket.share_pct } })}
          </Text>
        </YStack>
        <Text fontSize={isHost ? 22 : 14} fontWeight="700" color={isHost ? '$success' : '$color'}>
          {money(bucket.amount)}
        </Text>
        <MaterialIcons
          name="expand-more"
          size={20}
          color={muted}
          style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }}
        />
      </XStack>
      {invalid ? (
        <Text
          fontSize={12}
          fontWeight="600"
          color="$danger"
          paddingHorizontal={12}
          paddingBottom={10}
        >
          {t('mweb.createPod.venueShortfall')}
        </Text>
      ) : null}
      {open ? (
        <YStack backgroundColor="$surface" marginHorizontal={4} marginBottom={4} borderRadius={12}>
          {bucket.lines.map((line) => (
            <YStack key={line.key} paddingHorizontal={12} paddingVertical={6} gap={2}>
              <XStack justifyContent="space-between" gap={12}>
                <Text fontSize={13} color="$color" flexShrink={1}>
                  {line.label}
                </Text>
                <Text fontSize={13} fontWeight="700" color="$color">
                  {money(line.amount)}
                </Text>
              </XStack>
              <Text fontSize={12} color="$muted">
                {line.formula}
              </Text>
            </YStack>
          ))}
        </YStack>
      ) : null}
    </YStack>
  );
}

function rowBorder(invalid: boolean, isHost: boolean): string {
  if (invalid) return '$danger';
  return isHost ? '$success' : '$borderColor';
}
