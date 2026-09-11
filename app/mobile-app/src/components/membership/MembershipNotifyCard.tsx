import { useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { PrimaryButton } from '@/components/PrimaryButton';
import { SurfaceCard } from '@/components/SurfaceCard';
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
  const { accent, success } = useThemeColors();
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
      <SurfaceCard
        testID="membership-notify-done"
        marginHorizontal={16}
        flexDirection="row"
        gap={12}
        alignItems="center"
      >
        <YStack
          width={40}
          height={40}
          borderRadius={20}
          alignItems="center"
          justifyContent="center"
          backgroundColor="$successSoft"
        >
          <MaterialIcons name="mark-email-read" size={20} color={success} />
        </YStack>
        <YStack flex={1} gap={2}>
          <Text fontSize={14} fontWeight="600" color="$color">
            {t('mweb.membership.notifyDone')}
          </Text>
          <Text fontSize={14} color="$muted">
            {t('mweb.membership.notifyDoneBody')}
          </Text>
        </YStack>
      </SurfaceCard>
    );
  }

  const hasEmail = email.length > 0;

  return (
    <SurfaceCard testID="membership-notify-card" marginHorizontal={16} gap={16}>
      <XStack alignItems="center" gap={8}>
        <MaterialIcons name="notifications-active" size={20} color={accent} />
        <Text flex={1} fontSize={17} fontWeight="600" color="$color">
          {t('mweb.membership.notifyTitle')}
        </Text>
      </XStack>

      <YStack gap={6}>
        <Text fontSize={12} fontWeight="600" color="$muted">
          {t('mweb.membership.notifyEmailLabel')}
        </Text>
        <YStack
          paddingHorizontal={14}
          height={48}
          justifyContent="center"
          borderRadius={14}
          borderWidth={1}
          borderColor={hasEmail ? '$borderColor' : '$danger'}
          backgroundColor="$soft"
        >
          <Text fontSize={14} color="$color" numberOfLines={1}>
            {email}
          </Text>
        </YStack>
        <Text fontSize={12} color={hasEmail ? '$muted' : '$danger'}>
          {hasEmail ? t('mweb.membership.notifyEmailHint') : t('mweb.membership.notifyNoEmail')}
        </Text>
      </YStack>

      {hasFailed ? (
        <Text testID="membership-notify-error" fontSize={13} color="$danger">
          {t('mweb.membership.notifyError')}
        </Text>
      ) : null}

      <PrimaryButton
        testID="membership-notify-cta"
        label={
          isSubmitting ? t('mweb.membership.notifySubmitting') : t('mweb.membership.notifyCta')
        }
        loading={isSubmitting}
        disabled={!hasEmail}
        onPress={onSubscribe}
      />
    </SurfaceCard>
  );
}
