import { useState } from 'react';
import { Share } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { MaterialIcons } from '@expo/vector-icons';
import { ScrollView, Spinner, Text, XStack, YStack } from 'tamagui';

import { StackScreen } from '@/components/StackScreen';
import { referralLink, renderReferralMessage } from '@duncit/utils';

import { useReferral, type MyReferral } from '@/hooks/useReferral';
import { useTranslation } from '@/hooks/useTranslation';
import { POD_WEB_BASE } from '@/utils/pod-format';
import { useShareUrl } from '@/hooks/useShareUrl';
import { useThemeColors } from '@/hooks/useThemeColors';
import { formatRelative } from '@/utils/date-format';

type ReferredEntry = MyReferral['referred'][number];

/** How long the "copied" line stays up before it stops being news. */
const NOTICE_MS = 3000;

interface ActionProps {
  testID: string;
  label: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  tint: string;
  filled?: boolean;
  onPress: () => void;
}

/** One of the three ways a code leaves this screen. */
function ShareAction({ testID, label, icon, tint, filled, onPress }: Readonly<ActionProps>) {
  return (
    <XStack
      testID={testID}
      role="button"
      aria-label={label}
      onPress={onPress}
      alignItems="center"
      gap={6}
      paddingHorizontal={14}
      paddingVertical={8}
      borderRadius={999}
      borderWidth={filled ? 0 : 1}
      borderColor="$borderColor"
      backgroundColor={filled ? '$primary' : 'transparent'}
      pressStyle={{ opacity: 0.85 }}
    >
      <MaterialIcons name={icon} size={15} color={tint} />
      <Text fontSize={12.5} fontWeight="700" color={filled ? '$onPrimary' : '$color'}>
        {label}
      </Text>
    </XStack>
  );
}

interface CodeCardProps {
  referral: MyReferral;
  onPrimary: string;
  primary: string;
  ink: string;
  onShare: () => void;
  onCopyCode: () => void;
  onCopyLink: () => void;
}

/** My code, the three ways to pass it on, and what it is worth. */
function CodeCard({
  referral,
  onPrimary,
  primary,
  ink,
  onShare,
  onCopyCode,
  onCopyLink,
}: Readonly<CodeCardProps>) {
  const { t } = useTranslation();

  return (
    <YStack
      gap={6}
      padding={16}
      borderRadius={16}
      borderWidth={1}
      borderColor="$borderColor"
      backgroundColor="$surface"
    >
      <Text fontSize={11} fontWeight="700" color="$muted">
        {t('mweb.referral.yourCode')}
      </Text>
      <Text testID="referral-code" fontSize={22} fontWeight="700" color="$color" letterSpacing={1}>
        {referral.code}
      </Text>

      {/*
        Three ways out, because they travel differently: a code survives being
        read out loud, a link does the typing for whoever receives it, and the
        share sheet carries the message Finance wrote around both.
      */}
      <XStack gap={8} flexWrap="wrap" paddingTop={6}>
        <ShareAction
          testID="referral-share"
          label={t('mweb.referral.share')}
          icon="share"
          tint={onPrimary}
          filled
          onPress={onShare}
        />
        <ShareAction
          testID="referral-copy-code"
          label={t('mweb.referral.copyCode')}
          icon="content-copy"
          tint={ink}
          onPress={onCopyCode}
        />
        <ShareAction
          testID="referral-copy-link"
          label={t('mweb.referral.copyLink')}
          icon="link"
          tint={ink}
          onPress={onCopyLink}
        />
      </XStack>

      {referral.coins_per_referral > 0 ? (
        <XStack alignItems="center" gap={8} paddingTop={6}>
          <MaterialIcons name="monetization-on" size={18} color={primary} />
          <Text testID="referral-coins" flex={1} fontSize={13} fontWeight="700" color="$color">
            {t('mweb.referral.bothEarn', { vars: { coins: referral.coins_per_referral } })}
          </Text>
        </XStack>
      ) : null}
      {referral.gift_description ? (
        <XStack alignItems="center" gap={8} paddingTop={6}>
          <MaterialIcons name="card-giftcard" size={18} color={primary} />
          <Text testID="referral-gift" flex={1} fontSize={13} fontWeight="700" color="$color">
            {referral.gift_description}
          </Text>
        </XStack>
      ) : null}
      {referral.referred_by_name ? (
        <Text testID="referral-referred-by" fontSize={12} color="$muted">
          {t('mweb.referral.referredBy', { vars: { name: referral.referred_by_name } })}
        </Text>
      ) : null}
    </YStack>
  );
}

/** One friend I brought in. */
function ReferredRow({
  entry,
  fallbackName,
}: Readonly<{ entry: ReferredEntry; fallbackName: string }>) {
  return (
    <XStack
      testID={`referral-row-${entry.user_id}`}
      alignItems="center"
      gap={10}
      padding={12}
      borderRadius={12}
      borderWidth={1}
      borderColor="$borderColor"
      backgroundColor="$surface"
    >
      <Text flex={1} fontSize={14} fontWeight="600" color="$color" numberOfLines={1}>
        {entry.full_name || fallbackName}
      </Text>
      <Text fontSize={11.5} fontWeight="700" color="$muted">
        {formatRelative(entry.referred_at)} ago
      </Text>
    </XStack>
  );
}

/**
 * Refer & Earn — my code and the three ways to pass it on. mWeb's twin.
 *
 * There is no "enter a friend's code" box any more: a code is redeemed once, at
 * signup, where it can still be checked while the form is on screen.
 */
export function ReferralScreen() {
  const { t } = useTranslation();
  const { onPrimary, primary, color } = useThemeColors();
  const { referral, isLoading } = useReferral();
  const [notice, setNotice] = useState<string | null>(null);
  const referredList = referral?.referred ?? [];

  // Handed out as a tracked duncit.com link, so the signups a member brings in
  // are attributed to their share (mWeb does the same).
  const link = useShareUrl(
    'REFERRAL',
    referral?.code ?? '',
    referral ? referralLink(referral.code, POD_WEB_BASE) : '',
  );

  const flash = (message: string) => {
    setNotice(message);
    globalThis.setTimeout(() => setNotice(null), NOTICE_MS);
  };

  const copy = (value: string, message: string) => {
    Clipboard.setStringAsync(value)
      .then(() => flash(message))
      .catch(() => undefined);
  };

  const share = () => {
    if (!referral) return;
    Share.share({
      title: t('mweb.referral.title'),
      // No `url` field: iOS repeats a link given both ways, and the message
      // already carries one.
      message: renderReferralMessage(referral.share_message, {
        code: referral.code,
        link,
        coins: referral.coins_per_referral,
      }),
    }).catch(() => undefined);
  };

  return (
    <StackScreen title={t('mweb.referral.title')} testID="referral-screen">
      {isLoading && !referral ? (
        <YStack flex={1} alignItems="center" justifyContent="center">
          <Spinner testID="referral-loading" color="$primary" />
        </YStack>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          <YStack gap={14} padding={16} paddingBottom={48}>
            {referral ? (
              <CodeCard
                referral={referral}
                onPrimary={onPrimary}
                primary={primary}
                ink={color}
                onShare={share}
                onCopyCode={() => copy(referral.code, t('mweb.referral.codeCopied'))}
                onCopyLink={() => copy(link, t('mweb.referral.linkCopied'))}
              />
            ) : null}

            {notice ? (
              <Text testID="referral-notice" fontSize={12.5} fontWeight="700" color="$primary">
                {notice}
              </Text>
            ) : null}

            <Text fontSize={16} fontWeight="700" color="$color">
              {t('mweb.referral.friendsCount', { vars: { count: referredList.length } })}
            </Text>
            {referredList.length === 0 ? (
              <Text testID="referral-empty" fontSize={13} color="$muted">
                {t('mweb.referral.empty')}
              </Text>
            ) : (
              referredList.map((entry) => (
                <ReferredRow
                  key={entry.user_id}
                  entry={entry}
                  fallbackName={t('mweb.referral.newMember')}
                />
              ))
            )}
          </YStack>
        </ScrollView>
      )}
    </StackScreen>
  );
}
