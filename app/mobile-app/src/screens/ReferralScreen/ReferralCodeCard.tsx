import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { IconDisc } from '@/components/account/IconDisc';
import { DuncitButton } from '@/components/DuncitButton';
import { SurfaceCard } from '@/components/SurfaceCard';
import { TwoToneHeading } from '@/components/TwoToneHeading';
import type { MyReferral } from '@/hooks/useReferral';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { PRESS_STYLE } from '@duncit/buttons-native';

interface Props {
  referral: MyReferral;
  onShare: () => void;
  onCopyCode: () => void;
  onCopyLink: () => void;
}

/** The hero: what referring is worth, my code, and the ways to pass it on.
 * mWeb twin: pages/referral-page/ReferralCodeCard. */
export function ReferralCodeCard({ referral, onShare, onCopyCode, onCopyLink }: Readonly<Props>) {
  const { t } = useTranslation();
  const { color, onPrimary } = useThemeColors();
  const coins =
    referral.coins_per_referral > 0
      ? t('mweb.referral.bothEarn', { vars: { coins: referral.coins_per_referral } })
      : null;

  return (
    <SurfaceCard padding={20} gap={16} alignItems="center">
      <IconDisc icon="card-giftcard" size={56} />
      <TwoToneHeading
        testID={coins ? 'referral-coins' : undefined}
        lead={t('mweb.referral.title')}
        trail={coins}
        stacked
        fontSize={22}
        align="center"
      />

      <YStack gap={6} alignSelf="stretch" alignItems="center">
        <Text fontSize={12} fontWeight="600" color="$muted">
          {t('mweb.referral.yourCode')}
        </Text>
        <XStack
          alignSelf="stretch"
          alignItems="center"
          gap={8}
          minHeight={56}
          paddingLeft={20}
          paddingRight={6}
          borderRadius={999}
          borderWidth={1.5}
          borderStyle="dashed"
          borderColor="$borderColor"
          backgroundColor="$soft"
        >
          <Text
            testID="referral-code"
            flex={1}
            fontSize={20}
            fontWeight="700"
            letterSpacing={2}
            color="$color"
            numberOfLines={1}
          >
            {referral.code}
          </Text>
          <XStack
            testID="referral-copy-code"
            role="button"
            aria-label={t('mweb.referral.copyCode')}
            onPress={onCopyCode}
            width={44}
            height={44}
            borderRadius={22}
            alignItems="center"
            justifyContent="center"
            backgroundColor="$surface"
            pressStyle={PRESS_STYLE.ghost}
          >
            <MaterialIcons name="content-copy" size={18} color={color} />
          </XStack>
        </XStack>
      </YStack>

      {/*
        Three ways out, because they travel differently: a code survives being
        read out loud, a link does the typing for whoever receives it, and the
        share sheet carries the message Finance wrote around both.
      */}
      <XStack gap={8} alignSelf="stretch">
        <YStack flex={1}>
          <DuncitButton
            testID="referral-share"
            label={t('mweb.referral.share')}
            size="lg"
            fullWidth
            icon={<MaterialIcons name="share" size={18} color={onPrimary} />}
            onPress={onShare}
          />
        </YStack>
        <YStack flex={1}>
          <DuncitButton
            testID="referral-copy-link"
            label={t('mweb.referral.copyLink')}
            variant="soft"
            tone="neutral"
            size="lg"
            fullWidth
            icon={<MaterialIcons name="link" size={18} color={color} />}
            onPress={onCopyLink}
          />
        </YStack>
      </XStack>

      {referral.gift_description ? (
        <XStack alignItems="center" gap={12} alignSelf="stretch">
          <IconDisc icon="card-giftcard" />
          <Text testID="referral-gift" flex={1} fontSize={14} fontWeight="500" color="$color">
            {referral.gift_description}
          </Text>
        </XStack>
      ) : null}
      {referral.referred_by_name ? (
        <Text testID="referral-referred-by" fontSize={12} color="$muted">
          {t('mweb.referral.referredBy', { vars: { name: referral.referred_by_name } })}
        </Text>
      ) : null}
    </SurfaceCard>
  );
}
