import { useState } from 'react';
import { startOfDay } from 'date-fns';

import { DuncitDialog } from '@/components/DuncitDialog';
import { Field } from '@/components/Field';
import { CalendarSheet } from '@/components/create-pod/DateTimeSheet';
import { useDateFormat } from '@/hooks/useDateFormat';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { PickerTrigger } from './PickerTrigger';

interface Props {
  label: string;
  value: Date | null;
  onChange: (next: Date) => void;
  /** Earliest pickable moment — the sheet blocks anything before it. */
  minDateTime?: Date | null;
  /** On, the sheet asks for a time too; off, it answers a local midnight. */
  withTime?: boolean;
  disabled?: boolean;
  hint?: string;
  testID: string;
}

/**
 * A date — or a date and time — picked from the app's own calendar sheet: the
 * Tamagui stand-in for MUIX's DatePicker / DateTimePicker (rule 27). The value
 * is shown in the admin's date and time formats (rule 11).
 */
export function DateTimePickerField({
  label,
  value,
  onChange,
  minDateTime = null,
  withTime = false,
  disabled = false,
  hint,
  testID,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const fmt = useDateFormat();
  const { muted } = useThemeColors();
  const [open, setOpen] = useState(false);

  let shown = '—';
  if (value) shown = withTime ? fmt.formatDateTime(value) : fmt.formatDate(value);

  const close = () => setOpen(false);

  return (
    <Field label={label} hint={hint} testID={testID}>
      <PickerTrigger
        testID={testID}
        label={label}
        shown={shown}
        hasValue={!!value}
        icon="event"
        disabled={disabled}
        onPress={() => setOpen(true)}
      />
      <DuncitDialog
        open={open}
        onClose={close}
        testID={`${testID}-sheet`}
        title={label}
        closeLabel={t('mweb.common.close')}
        variant="center"
      >
        {open ? (
          <CalendarSheet
            testID={testID}
            initial={value}
            minDateTime={minDateTime}
            muted={muted}
            showTime={withTime}
            onDone={(picked) => {
              onChange(withTime ? picked : startOfDay(picked));
              close();
            }}
          />
        ) : null}
      </DuncitDialog>
    </Field>
  );
}
