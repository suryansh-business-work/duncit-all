import { useEffect, useState } from 'react';
import { ScrollView, Spinner, Text, XStack, YStack } from 'tamagui';
import type { ResultOf } from '@graphql-typed-document-node/core';

import { StackScreen } from '@/components/StackScreen';
import {
  MembershipComparison,
  MembershipNotifyCard,
  MembershipPlanCards,
} from '@/components/membership';
import { MobileMembershipPricingDocument } from '@/graphql/membership';
import { graphqlRequest } from '@/services/graphql.client';
import { useMe } from '@/hooks/useMe';
import { useTranslation } from '@/hooks/useTranslation';

type PricingData = ResultOf<typeof MobileMembershipPricingDocument>['membershipPricing'];

/**
 * Membership — the tier cards, the full comparison table and the notify-me
 * form. RN twin of mWeb's MembershipPage (rule 27); reached only through the
 * flag-gated sidebar row.
 *
 * Every tier, price and comparison row comes from Admin > Membership, so this
 * screen never states a benefit of its own. The CTAs are disabled throughout —
 * membership is announced here, not sold.
 */
export function MembershipScreen() {
  const { t } = useTranslation();
  const { data: me } = useMe();
  const [pricing, setPricing] = useState<PricingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let active = true;
    graphqlRequest(MobileMembershipPricingDocument, {}, { auth: true })
      .then((data) => active && setPricing(data.membershipPricing))
      .catch(() => active && setHasError(true))
      .finally(() => active && setIsLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const plans = pricing?.plans ?? [];
  const benefits = pricing?.benefits ?? [];

  let body;
  if (hasError) {
    body = (
      <Text testID="membership-error" paddingHorizontal={16} fontSize={13} color="$danger">
        {t('mweb.membership.loadError')}
      </Text>
    );
  } else if (isLoading && !pricing) {
    body = (
      <YStack alignItems="center" paddingVertical={32} testID="membership-loading">
        <Spinner size="large" />
      </YStack>
    );
  } else if (plans.length === 0) {
    body = (
      <Text testID="membership-empty" paddingHorizontal={16} fontSize={13} color="$muted">
        {t('mweb.membership.empty')}
      </Text>
    );
  } else {
    body = (
      <>
        <MembershipPlanCards plans={plans} />
        <MembershipComparison plans={plans} benefits={benefits} />
      </>
    );
  }

  return (
    <StackScreen title={t('mweb.membership.title')} testID="membership-screen">
      <ScrollView flex={1} showsVerticalScrollIndicator={false}>
        <YStack gap={14} paddingVertical={12}>
          <YStack paddingHorizontal={16} gap={6}>
            <XStack alignItems="center" gap={8} flexWrap="wrap">
              <Text fontSize={16} fontWeight="700" color="$color">
                {t('mweb.membership.heading')}
              </Text>
              <Text
                fontSize={10}
                fontWeight="700"
                textTransform="uppercase"
                letterSpacing={0.3}
                color="$primary"
                borderWidth={1}
                borderColor="$primary"
                borderRadius={999}
                paddingHorizontal={7}
                paddingVertical={2}
              >
                {t('mweb.membership.comingSoon')}
              </Text>
            </XStack>
            <Text fontSize={13} color="$muted">
              {t('mweb.membership.subheading')}
            </Text>
          </YStack>

          {body}

          <MembershipNotifyCard email={me?.me?.email ?? ''} subscribed={!!pricing?.is_subscribed} />
        </YStack>
      </ScrollView>
    </StackScreen>
  );
}
