import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { COIN_GOLD_TINT } from '@/constants/coin-gold';
import { useCoinBalance, useCoinGold } from '@/hooks/useCoins';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import type { MenuRoute } from '@/navigation/types';
import { COIN_TILE } from './profileSections';

/** Full-width Duncit Coin featured card (gold accent) — RN port of mWeb's
 * <DuncitCoinCard/>: the consumer's coin balance and the way into the ledger.
 * Rendered in User mode only. */
export function SidebarDuncitCoinCard({
  onNavigate,
}: Readonly<{ onNavigate: (route: MenuRoute) => void }>) {
  const { t } = useTranslation();
  const { muted } = useThemeColors();
  const gold = useCoinGold();
  const { balance } = useCoinBalance();

  return (
    <YStack paddingHorizontal={16} paddingBottom={10}>
      <XStack
        testID="sidebar-duncit-coin"
        role="button"
        aria-label={t('mweb.coin.title')}
        onPress={() => onNavigate(COIN_TILE.route)}
        alignItems="center"
        gap={12}
        borderRadius={12}
        borderWidth={1}
        borderColor="$borderColor"
        backgroundColor="$surface"
        padding={12}
        pressStyle={{ opacity: 0.85, borderColor: gold }}
      >
        <YStack
          width={44}
          height={44}
          alignItems="center"
          justifyContent="center"
          borderRadius={10}
          backgroundColor={COIN_GOLD_TINT}
        >
          <MaterialIcons name={COIN_TILE.icon} size={22} color={gold} />
        </YStack>
        <YStack flex={1}>
          <Text numberOfLines={1} fontSize={14} fontWeight="600" color="$color">
            {t('mweb.coin.title')}
          </Text>
          <Text numberOfLines={1} fontSize={12} color="$muted">
            {t('mweb.coin.sidebarCaption', { vars: { pct: balance?.earn_pct ?? 0 } })}
          </Text>
        </YStack>
        <Text
          testID="sidebar-duncit-coin-balance"
          numberOfLines={1}
          fontSize={14}
          fontWeight="700"
          color={gold}
        >
          {balance?.balance ?? 0}
        </Text>
        <MaterialIcons name="chevron-right" size={20} color={muted} />
      </XStack>
    </YStack>
  );
}
