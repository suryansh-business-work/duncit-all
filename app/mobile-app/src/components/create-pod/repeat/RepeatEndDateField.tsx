import { useState } from 'react';

import { DuncitDialog } from '@/components/DuncitDialog';
import { Field } from '@/components/Field';
import { PickerTrigger } from '@/components/venue-availability/PickerTrigger';
import { useDateFormat } from '@/hooks/useDateFormat';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { CalendarSheet } from '../DateTimeSheet';

interface Props {
  label: string;
  hint: string;
  /** 'yyyy-MM-dd', or '' when none is picked. */
  value: string;
  onChange: (day: string) => void;
  /** The pod's first date — the series cannot end before it. */
  minDate: Date | null;
  error?: string;
}

/** The day a recurring pod stops repeating, picked from the app's calendar
 * sheet without a time — the Tamagui stand-in for mWeb's MUI X DatePicker
 * (rule 27), shown in the admin's date format, stored as 'yyyy-MM-dd'. */
export function RepeatEndDateField({
  label,
  hint,
  value,
  onChange,
  minDate,
  error,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const fmt = useDateFormat();
  const { muted } = useThemeColors();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  return (
    <Field label={label} required hint={hint} error={error} testID="pod-repeat-ends-on">
      <PickerTrigger
        testID="pod-repeat-ends-on"
        label={label}
        shown={value ? fmt.formatDay(value) : fmt.datePlaceholder}
        hasValue={!!value}
        icon="event"
        onPress={() => setOpen(true)}
      />
      <DuncitDialog
        open={open}
        onClose={close}
        testID="pod-repeat-ends-on-sheet"
        title={label}
        closeLabel={t('mweb.common.close')}
        variant="center"
      >
        {open ? (
          <CalendarSheet
            testID="pod-repeat-ends-on"
            initial={value ? new Date(`${value}T12:00:00`) : minDate}
            minDateTime={minDate}
            muted={muted}
            showTime={false}
            onDone={(picked) => {
              onChange(fmt.toIsoDay(picked));
              close();
            }}
          />
        ) : null}
      </DuncitDialog>
    </Field>
  );
}
