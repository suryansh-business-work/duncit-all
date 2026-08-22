import type { GrievanceSupportTicketOption } from '@duncit/utils';
import { Text, XStack, YStack } from 'tamagui';

interface RowProps {
  option: GrievanceSupportTicketOption;
  selected: boolean;
  onPick: (value: string) => void;
}

/**
 * One ticket in the open dropdown.
 *
 * Its own component so the selected/unselected colours are decided ONCE per row
 * at nesting zero, rather than as three conditionals inside the list's JSX
 * (rules 26b/26g) — and so the list keys on the ticket number, never the index.
 */
function GrievanceTicketOptionRow({ option, selected, onPick }: Readonly<RowProps>) {
  const background = selected ? '$primary' : 'transparent';
  const ink = selected ? '$onPrimary' : '$color';
  const weight = selected ? '700' : '600';
  return (
    <XStack
      testID={`grievance-ticket-option-${option.value}`}
      role="button"
      aria-label={option.label}
      aria-pressed={selected}
      onPress={() => onPick(option.value)}
      paddingHorizontal={12}
      paddingVertical={11}
      backgroundColor={background}
      pressStyle={{ opacity: 0.8 }}
    >
      <Text fontSize={13} fontWeight={weight} color={ink}>
        {option.label}
      </Text>
    </XStack>
  );
}

interface Props {
  options: GrievanceSupportTicketOption[];
  value: string;
  onPick: (value: string) => void;
}

/** The expanded list of the user's support tickets. */
export function GrievanceTicketOptions({ options, value, onPick }: Readonly<Props>) {
  return (
    <YStack
      testID="grievance-support_ticket_ref-options"
      borderRadius={12}
      borderWidth={1}
      borderColor="$borderColor"
      backgroundColor="$surface"
      overflow="hidden"
    >
      {options.map((option) => (
        <GrievanceTicketOptionRow
          key={option.value}
          option={option}
          selected={option.value === value}
          onPick={onPick}
        />
      ))}
    </YStack>
  );
}
