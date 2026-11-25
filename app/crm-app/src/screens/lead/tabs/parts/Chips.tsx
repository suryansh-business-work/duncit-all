import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, useTheme } from 'tamagui';
import { CRM_LEAD_PRIORITY_TONE, CRM_LEAD_STATUS_TONE, crmToneOf } from '@duncit/utils';

import { ToneChip } from '@/components/ToneChip';
import { RADII } from '@/constants/design';
import type { IconName } from './DetailCard';

interface ChipProps {
  label: string;
  icon?: IconName;
  /** The accent outline the portal gives the super category chip. */
  accent?: boolean;
  testID?: string;
}

/** An outlined chip, as the portal's hero row draws a city, a type or a tag. */
export function Chip({ label, icon, accent, testID }: Readonly<ChipProps>) {
  const theme = useTheme();
  const colour = accent ? '$accentText' : '$color';
  return (
    <XStack
      alignItems="center"
      gap="$1"
      borderWidth={1}
      borderColor={accent ? '$accentText' : '$borderColor'}
      borderRadius={RADII.pill}
      paddingHorizontal="$2.5"
      paddingVertical="$1"
      testID={testID}
    >
      {icon ? (
        <MaterialIcons
          name={icon}
          size={14}
          color={accent ? theme.accentText?.val : theme.muted?.val}
          accessibilityElementsHidden
        />
      ) : null}
      <Text color={colour} fontSize="$2" fontWeight="600">
        {label}
      </Text>
    </XStack>
  );
}

/** A lead's pipeline stage in its colour (New, Won, Lost…); nothing when it has none. */
export function StatusChip({ value }: Readonly<{ value: string | null | undefined }>) {
  if (!value) return null;
  return (
    <ToneChip
      label={value}
      tone={crmToneOf(CRM_LEAD_STATUS_TONE, value)}
      testID="lead-status-chip"
    />
  );
}

/** A lead's priority in its colour (Low, Medium, High); nothing when it has none. */
export function PriorityChip({ value }: Readonly<{ value: string | null | undefined }>) {
  if (!value) return null;
  return (
    <ToneChip
      label={value}
      tone={crmToneOf(CRM_LEAD_PRIORITY_TONE, value)}
      testID="lead-priority-chip"
    />
  );
}
