import { MaterialIcons } from '@expo/vector-icons';
import { ScrollView, Text, XStack, YStack } from 'tamagui';

import { groupMembershipBenefits, membershipCellKind, membershipCellValue } from '@duncit/utils';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import type { MembershipBenefitShape, MembershipPlanShape } from './types';

/** Widths are fixed so the sticky label column and the scrolling grid stay in
 * lockstep — two independently-sized columns would drift row by row. */
const LABEL_WIDTH = 156;
const CELL_WIDTH = 92;
const ROW_HEIGHT = 44;
const GROUP_HEIGHT = 32;

/** A cell drawn from its value: a tick, a dash, or the text as typed. Icons
 * come from @expo/vector-icons, never a glyph in the data (rule 31). */
function BenefitCell({
  value,
  yes,
  no,
  yesLabel,
  noLabel,
}: Readonly<{ value: string; yes: string; no: string; yesLabel: string; noLabel: string }>) {
  const kind = membershipCellKind(value);
  // The icon IS the answer, so it carries the label — a screen reader landing
  // on a bare tick otherwise hears nothing at all.
  if (kind === 'YES') {
    return (
      <MaterialIcons name="check-circle" size={18} color={yes} accessibilityLabel={yesLabel} />
    );
  }
  if (kind === 'NO') {
    return <MaterialIcons name="remove" size={18} color={no} accessibilityLabel={noLabel} />;
  }
  return (
    <Text fontSize={12} fontWeight="700" color="$color" numberOfLines={1}>
      {value}
    </Text>
  );
}

/**
 * The comparison matrix — RN twin of mWeb's <ComparisonTable/>.
 *
 * The label column sits OUTSIDE the horizontal ScrollView rather than inside
 * it, which is how a phone gets a sticky first column: the labels stay put
 * while the tiers scroll past them.
 */
export function MembershipComparison({
  plans,
  benefits,
}: Readonly<{
  plans: readonly MembershipPlanShape[];
  benefits: readonly MembershipBenefitShape[];
}>) {
  const { t } = useTranslation();
  const { success, muted } = useThemeColors();
  const groups = groupMembershipBenefits(benefits);
  const yesLabel = t('mweb.membership.included');
  const noLabel = t('mweb.membership.notIncluded');

  return (
    <YStack gap={6} testID="membership-comparison">
      <YStack paddingHorizontal={16} gap={2}>
        <Text fontSize={15} fontWeight="700" color="$color">
          {t('mweb.membership.compareTitle')}
        </Text>
        <Text fontSize={11} color="$muted">
          {t('mweb.membership.compareHint')}
        </Text>
      </YStack>

      <XStack
        marginHorizontal={16}
        borderRadius={16}
        borderWidth={1}
        borderColor="$borderColor"
        backgroundColor="$surface"
        overflow="hidden"
      >
        {/* Sticky label column. */}
        <YStack width={LABEL_WIDTH} borderRightWidth={1} borderRightColor="$borderColor">
          <XStack height={ROW_HEIGHT} alignItems="center" paddingHorizontal={10}>
            <Text fontSize={11} fontWeight="800" textTransform="uppercase" color="$muted">
              {t('mweb.membership.benefitColumn')}
            </Text>
          </XStack>
          {groups.map((group) => (
            <YStack key={group.group}>
              <XStack
                height={GROUP_HEIGHT}
                alignItems="center"
                paddingHorizontal={10}
                backgroundColor="$background"
              >
                <Text
                  fontSize={10}
                  fontWeight="800"
                  textTransform="uppercase"
                  letterSpacing={0.4}
                  color="$muted"
                  numberOfLines={1}
                >
                  {group.group}
                </Text>
              </XStack>
              {group.rows.map((row) => (
                <XStack key={row.id} height={ROW_HEIGHT} alignItems="center" paddingHorizontal={10}>
                  <Text fontSize={12} fontWeight="600" color="$color" numberOfLines={2}>
                    {row.label}
                  </Text>
                </XStack>
              ))}
            </YStack>
          ))}
        </YStack>

        {/* Scrolling tier columns. */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <YStack>
            <XStack height={ROW_HEIGHT} alignItems="center">
              {plans.map((plan) => (
                <XStack key={plan.id} width={CELL_WIDTH} justifyContent="center">
                  <Text
                    fontSize={11}
                    fontWeight="800"
                    textTransform="uppercase"
                    color={plan.accent_color || '$primary'}
                    numberOfLines={1}
                  >
                    {plan.name}
                  </Text>
                </XStack>
              ))}
            </XStack>
            {groups.map((group) => (
              <YStack key={group.group}>
                <XStack height={GROUP_HEIGHT} backgroundColor="$background" />
                {group.rows.map((row) => (
                  <XStack key={row.id} height={ROW_HEIGHT} alignItems="center">
                    {plans.map((plan) => (
                      <XStack
                        key={plan.id}
                        width={CELL_WIDTH}
                        justifyContent="center"
                        alignItems="center"
                      >
                        <BenefitCell
                          value={membershipCellValue(row, plan.key)}
                          yes={success}
                          no={muted}
                          yesLabel={yesLabel}
                          noLabel={noLabel}
                        />
                      </XStack>
                    ))}
                  </XStack>
                ))}
              </YStack>
            ))}
          </YStack>
        </ScrollView>
      </XStack>

      <Text paddingHorizontal={16} fontSize={11} color="$muted">
        {t('mweb.membership.footnote')}
      </Text>
    </YStack>
  );
}
