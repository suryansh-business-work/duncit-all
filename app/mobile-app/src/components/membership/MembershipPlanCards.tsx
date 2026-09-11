import { ScrollView, Text, XStack, YStack } from 'tamagui';

import { SurfaceCard } from '@/components/SurfaceCard';
import { useTranslation } from '@/hooks/useTranslation';
import type { MembershipPlanShape } from './types';

/** One tier's card. Hoisted to module scope so the rail below stays a plain
 * map (S6478); the accent arrives as a prop rather than being recomputed. The
 * tier's own admin-set colour marks its name; the card is the calm surface. */
function PlanCard({ plan, accent }: Readonly<{ plan: MembershipPlanShape; accent: string }>) {
  return (
    <SurfaceCard testID={`membership-plan-${plan.key}`} width={232} gap={6}>
      <XStack alignItems="center" gap={6} flexWrap="wrap">
        <Text fontSize={14} fontWeight="600" color={accent}>
          {plan.name}
        </Text>
        {plan.badge_label ? (
          <XStack
            height={22}
            paddingHorizontal={8}
            alignItems="center"
            borderRadius={999}
            backgroundColor="$soft"
          >
            <Text fontSize={11} fontWeight="600" color="$muted">
              {plan.badge_label}
            </Text>
          </XStack>
        ) : null}
      </XStack>

      <Text fontSize={24} fontWeight="700" color="$color">
        {plan.price_label}
      </Text>
      {plan.price_note ? (
        <Text fontSize={12} color="$muted">
          {plan.price_note}
        </Text>
      ) : null}
      {plan.tagline ? (
        <Text fontSize={14} color="$muted" flex={1}>
          {plan.tagline}
        </Text>
      ) : null}

      {/* Disabled throughout — membership is announced here, not sold. */}
      <XStack
        role="button"
        aria-disabled
        marginTop={8}
        height={44}
        alignItems="center"
        justifyContent="center"
        borderRadius={999}
        borderWidth={1}
        borderColor="$borderColor"
        opacity={0.55}
      >
        <Text fontSize={14} fontWeight="600" color="$muted">
          {plan.cta_label}
        </Text>
      </XStack>
    </SurfaceCard>
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
    <YStack gap={8}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 12, paddingHorizontal: 16 }}
      >
        {plans.map((plan) => (
          <PlanCard key={plan.id} plan={plan} accent={plan.accent_color || '$primary'} />
        ))}
      </ScrollView>
      <Text paddingHorizontal={16} fontSize={12} color="$muted">
        {t('mweb.membership.ctaDisabledHint')}
      </Text>
    </YStack>
  );
}
