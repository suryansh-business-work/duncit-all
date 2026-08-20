import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack } from 'tamagui';
import { autoPodTicks, type AutoPodLabels, type AutoPodRow } from '@duncit/utils';

import { useThemeColors } from '@/hooks/useThemeColors';

interface Props {
  row: Pick<AutoPodRow, 'venue_claim' | 'host_claim' | 'club_claim'>;
  labels: AutoPodLabels;
}

/**
 * The three enrolments an Auto Pod needs, always shown together and always in
 * order: Venue Enroll, Host Enroll, Club Admin Enroll. Amber while that partner
 * has yet to enrol, green the moment they do — so one glance says how far along
 * the offer is without reading a word.
 *
 * The Tamagui twin of `@duncit/auto-pods`' `AutoPodTicks` (rule 27): same three
 * ticks, same order, same two states, driven by the same `autoPodTicks()`
 * derivation so the two surfaces cannot disagree about who has enrolled.
 */
export function AutoPodTicksRow({ row, labels }: Readonly<Props>) {
  const { success, warning, onPrimary } = useThemeColors();

  return (
    <XStack gap={6} flexWrap="wrap">
      {autoPodTicks(row).map((tick) => {
        const label = labels.tick(tick.role);
        // Computed once per tick rather than repeated inline: the filled/green
        // and outlined/amber pair is one decision, not four.
        const tint = tick.done ? success : warning;
        const ink = tick.done ? onPrimary : warning;
        const background = tick.done ? success : 'transparent';
        const icon = tick.done ? 'check-circle' : 'hourglass-empty';

        return (
          <XStack
            key={tick.role}
            testID={`auto-pod-tick-${tick.role}`}
            aria-label={`${label} — ${tick.done ? labels.tickDone : labels.tickPending}`}
            alignItems="center"
            gap={4}
            paddingHorizontal={9}
            height={26}
            borderRadius={999}
            borderWidth={1}
            borderColor={tint}
            backgroundColor={background}
          >
            <MaterialIcons name={icon} size={13} color={ink} />
            <Text fontSize={11.5} fontWeight="700" color={ink}>
              {label}
            </Text>
          </XStack>
        );
      })}
    </XStack>
  );
}
