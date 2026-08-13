import { Button, ScrollView, Text, XStack, YStack } from 'tamagui';

import { useTranslation } from '@/hooks/useTranslation';
import type { MembershipPlanShape } from './types';

/** One tier's card. Hoisted to module scope so the rail below stays a plain
 * map (S6478); the accent arrives as a prop rather than being recomputed. */
function PlanCard({ plan, accent }: Readonly<{ plan: MembershipPlanShape; accent: string }>) {
  return (
    <YStack
      testID={`membership-plan-${plan.key}`}
      width={230}
      padding={14}
      gap={6}
      borderRadius={16}
      borderWidth={1}
      borderColor="$borderColor"
      borderTopWidth={3}
      borderTopColor={accent}
      backgroundColor="$surface"
    >
      <XStack alignItems="center" gap={6} flexWrap="wrap">
        <Text
          fontSize={11}
          fontWeight="800"
          letterSpacing={1}
          textTransform="uppercase"
          color={accent}
        >
          {plan.name}
        </Text>
        {plan.badge_label ? (
          <Text
            fontSize={9}
            fontWeight="700"
            textTransform="uppercase"
            color="$muted"
            borderWidth={1}
            borderColor="$borderColor"
            borderRadius={999}
            paddingHorizontal={6}
            paddingVertical={2}
          >
            {plan.badge_label}
          </Text>
        ) : null}
      </XStack>

      <Text fontSize={24} fontWeight="700" color="$color">
        {plan.price_label}
      </Text>
      {plan.price_note ? (
        <Text fontSize={11} color="$muted">
          {plan.price_note}
        </Text>
      ) : null}
      {plan.tagline ? (
        <Text fontSize={13} color="$muted" flex={1}>
          {plan.tagline}
        </Text>
      ) : null}

      {/* Disabled throughout — membership is announced here, not sold. */}
      <Button
        size="$3"
        marginTop={8}
        disabled
        opacity={0.55}
        chromeless
        borderWidth={1}
        borderColor="$borderColor"
      >
        <Text fontSize={13} fontWeight="700" color="$muted">
          {plan.cta_label}
        </Text>
      </Button>
    </YStack>
  );
}

/** The tier cards as one horizontally scrolling rail — RN twin of mWeb's
 * <PlanCards/>. Five columns never fit a phone, and stacking them buries the
 * comparison table below the fold. */
export function MembershipPlanCards({
  plans,
}: Readonly<{ plans: readonly MembershipPlanShape[] }>) {
  const { t } = useTranslation();
  return (
    <YStack gap={6}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 12, paddingHorizontal: 16 }}
      >
        {plans.map((plan) => (
          <PlanCard key={plan.id} plan={plan} accent={plan.accent_color || '$primary'} />
        ))}
      </ScrollView>
      <Text paddingHorizontal={16} fontSize={11} color="$muted">
        {t('mweb.membership.ctaDisabledHint')}
      </Text>
    </YStack>
  );
}
