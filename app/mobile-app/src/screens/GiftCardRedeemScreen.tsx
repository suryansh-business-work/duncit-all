import { useState } from 'react';
import { YStack } from 'tamagui';

import {
  GiftCardCodeRedeem,
  GiftCardHowItWorks,
  GiftCardPhysicalRedeem,
} from '@/components/gift-cards';
import { GiftCardSegmented, type SegmentOption } from '@/components/gift-cards/GiftCardSegmented';
import { StackScreen } from '@/components/StackScreen';
import { useTranslation } from '@/hooks/useTranslation';
import { RefreshScrollView } from '@/components/PullToRefresh';

type RedeemMode = 'code' | 'physical';

/** Redeem a gift card — the emailed/linked code, or a printed card's number and
 * scratch-panel passcode; either way the full value lands in Duncit Coins. RN
 * twin of mWeb's /gift-cards/redeem (rule 27), whose two tabs these are. */
export function GiftCardRedeemScreen() {
  const { t } = useTranslation();
  const [mode, setMode] = useState<RedeemMode>('code');
  const modes: readonly SegmentOption<RedeemMode>[] = [
    {
      value: 'code',
      label: t('mweb.giftCards.redeemModeCode'),
      testID: 'gift-card-redeem-tab-code',
    },
    {
      value: 'physical',
      label: t('mweb.giftCards.redeemModePhysical'),
      testID: 'gift-card-redeem-tab-physical',
    },
  ];

  return (
    <StackScreen title={t('mweb.giftCards.redeemTitle')} testID="gift-card-redeem-screen">
      <RefreshScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <YStack gap={16} padding={16} paddingBottom={48}>
          <GiftCardSegmented options={modes} value={mode} onChange={setMode} />
          {mode === 'physical' ? <GiftCardPhysicalRedeem /> : <GiftCardCodeRedeem />}
          <GiftCardHowItWorks />
        </YStack>
      </RefreshScrollView>
    </StackScreen>
  );
}
