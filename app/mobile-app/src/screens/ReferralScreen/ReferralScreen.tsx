import { Fragment, useState } from 'react';
import { Share } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Spinner, Text, YStack } from 'tamagui';

import { StackScreen } from '@/components/StackScreen';
import { SurfaceCard } from '@/components/SurfaceCard';
import { referralLink, renderReferralMessage } from '@duncit/utils';

import { useReferral } from '@/hooks/useReferral';
import { useTranslation } from '@/hooks/useTranslation';
import { POD_WEB_BASE } from '@/utils/pod-format';
import { useShareUrl } from '@/hooks/useShareUrl';
import { RefreshScrollView } from '@/components/PullToRefresh';
import { ReferralCodeCard } from './ReferralCodeCard';
import { ReferredRow } from './ReferredRow';

/** How long the "copied" line stays up before it stops being news. */
const NOTICE_MS = 3000;

/**
 * Refer & Earn — my code and the three ways to pass it on. mWeb's twin.
 *
 * There is no "enter a friend's code" box any more: a code is redeemed once, at
 * signup, where it can still be checked while the form is on screen.
 */
export function ReferralScreen() {
  const { t } = useTranslation();
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
        <RefreshScrollView showsVerticalScrollIndicator={false}>
          <YStack gap={16} padding={16} paddingBottom={48}>
            {referral ? (
              <ReferralCodeCard
                referral={referral}
                onShare={share}
                onCopyCode={() => copy(referral.code, t('mweb.referral.codeCopied'))}
                onCopyLink={() => copy(link, t('mweb.referral.linkCopied'))}
              />
            ) : null}

            {notice ? (
              <Text
                testID="referral-notice"
                fontSize={13}
                fontWeight="600"
                color="$primary"
                textAlign="center"
              >
                {notice}
              </Text>
            ) : null}

            <Text accessibilityRole="header" fontSize={17} fontWeight="600" color="$color">
              {t('mweb.referral.friendsCount', { vars: { count: referredList.length } })}
            </Text>
            {referredList.length === 0 ? (
              <Text
                testID="referral-empty"
                fontSize={14}
                color="$muted"
                textAlign="center"
                paddingVertical={16}
              >
                {t('mweb.referral.empty')}
              </Text>
            ) : (
              <SurfaceCard padding={0} overflow="hidden">
                {referredList.map((entry, index) => (
                  <Fragment key={entry.user_id}>
                    {index > 0 ? <YStack height={1} backgroundColor="$borderColor" /> : null}
                    <ReferredRow entry={entry} fallbackName={t('mweb.referral.newMember')} />
                  </Fragment>
                ))}
              </SurfaceCard>
            )}
          </YStack>
        </RefreshScrollView>
      )}
    </StackScreen>
  );
}
