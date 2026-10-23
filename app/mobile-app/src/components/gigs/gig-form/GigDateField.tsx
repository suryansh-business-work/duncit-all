import { useState } from 'react';

import { DuncitDialog } from '@/components/DuncitDialog';
import { Field } from '@/components/Field';
import { PickerTrigger } from '@/components/venue-availability/PickerTrigger';
import { useDateFormat } from '@/hooks/useDateFormat';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { CalendarSheet } from '@/components/create-pod/DateTimeSheet';

interface Props {
  label: string;
  hint: string;
  /** 'yyyy-MM-dd', or '' when none is picked. */
  value: string;
  onChange: (day: string) => void;
  /** The earliest day that can be picked. */
  minDate: Date | null;
  /** The latest day that can be picked, or none. */
  maxDate?: Date | null;
  error?: string;
  /** Whether a day must be picked. */
  required?: boolean;
  testID?: string;
}

/** One day, picked from the app's calendar
 * sheet without a time — the Tamagui stand-in for mWeb's MUI X DatePicker
 * (rule 27), shown in the admin's date format, stored as 'yyyy-MM-dd'. */
export function GigDateField({
  label,
  hint,
  value,
  onChange,
  minDate,
  maxDate = null,
  error,
  required = true,
  testID = 'gig-form-date',
}: Readonly<Props>) {
  const { t } = useTranslation();
  const fmt = useDateFormat();
  const { muted } = useThemeColors();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  return (
    <Field label={label} required={required} hint={hint} error={error} testID={testID}>
      <PickerTrigger
        testID={testID}
        label={label}
        shown={value ? fmt.formatDay(value) : fmt.datePlaceholder}
        hasValue={!!value}
        icon="event"
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
            initial={value ? new Date(`${value}T12:00:00`) : minDate}
            minDateTime={minDate}
            maxDate={maxDate}
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
