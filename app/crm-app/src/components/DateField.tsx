import {
  DateTimePickerAndroid,
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { MaterialIcons } from '@expo/vector-icons';
import { Label, Text, XStack, YStack, useTheme } from 'tamagui';
import { formatDate, formatDateTime, formatTime } from '@duncit/datetime';
import { fireAndForget, logs } from '@duncit/logs';
import { tokens } from '@duncit/theme/tokens';

import { RADII } from '@/constants/design';

export type DateFieldMode = 'date' | 'time' | 'datetime';

interface Props {
  label: string;
  value: Date | null;
  onChange: (value: Date | null) => void;
  mode?: DateFieldMode;
  /** Shown when there is no value. */
  placeholder: string;
  minimumDate?: Date;
  maximumDate?: Date;
  /** The field's error under it, if any. */
  error?: string | null;
  testID: string;
}

const FORMAT: Record<DateFieldMode, (date: Date) => string> = {
  date: formatDate,
  time: formatTime,
  datetime: formatDateTime,
};

/** Open the system picker for one part, then hand the chosen value on. */
function pick(
  mode: 'date' | 'time',
  value: Date,
  limits: Pick<Props, 'minimumDate' | 'maximumDate'>,
) {
  return new Promise<Date | null>((resolve) => {
    DateTimePickerAndroid.open({
      value,
      mode,
      is24Hour: false,
      minimumDate: limits.minimumDate,
      maximumDate: limits.maximumDate,
      onChange: (event: DateTimePickerEvent, date?: Date) =>
        resolve(event.type === 'set' && date ? date : null),
    });
  });
}

/**
 * A date, time or date-and-time field: tapping it opens the phone's own picker
 * (the portal's MUI pickers' counterpart), and the value shows in the
 * platform's configured format (@duncit/datetime, the formatter the portals use).
 */
export function DateField({
  label,
  value,
  onChange,
  mode = 'date',
  placeholder,
  minimumDate,
  maximumDate,
  error,
  testID,
}: Readonly<Props>) {
  const theme = useTheme();
  const open = async () => {
    const start = value ?? new Date();
    const limits = { minimumDate, maximumDate };
    const day = mode === 'time' ? start : await pick('date', start, limits);
    if (!day) return;
    if (mode === 'date') return onChange(day);
    const time = await pick('time', day, limits);
    if (time) onChange(time);
  };
  return (
    <YStack gap="$1">
      <Label fontWeight="600">{label}</Label>
      <XStack
        role="button"
        aria-label={`${label}: ${value ? FORMAT[mode](value) : placeholder}`}
        onPress={() => fireAndForget(open(), logs.mobileApp, 'crm-app/DateField', 'open')}
        alignItems="center"
        gap="$2"
        borderWidth={1}
        borderColor={error ? '$danger' : '$inputBorder'}
        borderRadius={RADII.sm}
        paddingHorizontal="$3"
        minHeight={tokens.size.touchTarget}
        testID={testID}
      >
        <MaterialIcons
          name={mode === 'time' ? 'schedule' : 'event'}
          size={20}
          color={theme.muted?.val}
          accessibilityElementsHidden
        />
        <Text flex={1} color={value ? '$color' : '$muted'}>
          {value ? FORMAT[mode](value) : placeholder}
        </Text>
      </XStack>
      {error ? (
        <Text color="$danger" fontSize="$2" role="alert">
          {error}
        </Text>
      ) : null}
    </YStack>
  );
}
