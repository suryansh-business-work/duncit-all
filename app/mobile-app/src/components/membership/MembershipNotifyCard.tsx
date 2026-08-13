import { useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Button, Spinner, Text, XStack, YStack } from 'tamagui';

import { MobileSubscribeMembershipNewsDocument } from '@/graphql/membership';
import { graphqlRequest } from '@/services/graphql.client';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';

/** The notify-me card — RN twin of mWeb's <NotifyCard/>. The address is shown
 * read-only because the server stamps it from the profile; a typed one would
 * be ignored. */
export function MembershipNotifyCard({
  email,
  subscribed,
}: Readonly<{ email: string; subscribed: boolean }>) {
  const { t } = useTranslation();
  const { primary, success } = useThemeColors();
  const [isDone, setIsDone] = useState(false);
  const [hasFailed, setHasFailed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isOnList = subscribed || isDone;

  const onSubscribe = () => {
    setHasFailed(false);
    setIsSubmitting(true);
    graphqlRequest(MobileSubscribeMembershipNewsDocument, {}, { auth: true })
      .then(() => setIsDone(true))
      .catch(() => setHasFailed(true))
      .finally(() => setIsSubmitting(false));
  };

  if (isOnList) {
    return (
      <XStack
        testID="membership-notify-done"
        marginHorizontal={16}
        padding={14}
        gap={10}
        borderRadius={16}
        borderWidth={1}
        borderColor="$borderColor"
        backgroundColor="$surface"
        alignItems="flex-start"
      >
        <MaterialIcons name="mark-email-read" size={20} color={success} />
        <YStack flex={1} gap={2}>
          <Text fontSize={14} fontWeight="700" color="$color">
            {t('mweb.membership.notifyDone')}
          </Text>
          <Text fontSize={12.5} color="$muted">
            {t('mweb.membership.notifyDoneBody')}
          </Text>
        </YStack>
      </XStack>
    );
  }

  const hasEmail = email.length > 0;

  return (
    <YStack
      testID="membership-notify-card"
      marginHorizontal={16}
      padding={16}
      gap={10}
      borderRadius={16}
      borderWidth={1}
      borderColor="$borderColor"
      backgroundColor="$surface"
    >
      <XStack alignItems="center" gap={8}>
        <MaterialIcons name="notifications-active" size={18} color={primary} />
        <Text fontSize={15} fontWeight="700" color="$color">
          {t('mweb.membership.notifyTitle')}
        </Text>
      </XStack>
      <Text fontSize={12.5} color="$muted">
        {t('mweb.membership.notifyBody')}
      </Text>

      <YStack gap={4}>
        <Text fontSize={11} fontWeight="600" color="$muted">
          {t('mweb.membership.notifyEmailLabel')}
        </Text>
        <YStack
          paddingHorizontal={12}
          paddingVertical={10}
          borderRadius={10}
          borderWidth={1}
          borderColor={hasEmail ? '$borderColor' : '$danger'}
          backgroundColor="$background"
        >
          <Text fontSize={13.5} color="$color" numberOfLines={1}>
            {email}
          </Text>
        </YStack>
        <Text fontSize={11} color={hasEmail ? '$muted' : '$danger'}>
          {hasEmail ? t('mweb.membership.notifyEmailHint') : t('mweb.membership.notifyNoEmail')}
        </Text>
      </YStack>

      {hasFailed ? (
        <Text testID="membership-notify-error" fontSize={12.5} color="$danger">
          {t('mweb.membership.notifyError')}
        </Text>
      ) : null}

      <Button
        testID="membership-notify-cta"
        size="$3"
        backgroundColor="$primary"
        disabled={isSubmitting || !hasEmail}
        opacity={isSubmitting || !hasEmail ? 0.6 : 1}
        onPress={onSubscribe}
      >
        <XStack alignItems="center" gap={8}>
          {isSubmitting ? <Spinner size="small" color="$onPrimary" /> : null}
          <Text fontSize={13.5} fontWeight="700" color="$onPrimary">
            {isSubmitting ? t('mweb.membership.notifySubmitting') : t('mweb.membership.notifyCta')}
          </Text>
        </XStack>
      </Button>
    </YStack>
  );
}
