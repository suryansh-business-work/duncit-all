import { useState } from 'react';
import { parseIsoDay } from '@duncit/datetime';

import { DuncitDialog } from '@/components/DuncitDialog';
import { Field } from '@/components/Field';
import { PickerTrigger } from '@/components/venue-availability/PickerTrigger';
import { DobCalendarSheet } from '@/forms/account-edit/DobCalendarSheet';
import { useDateFormat } from '@/hooks/useDateFormat';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  label: string;
  /** The picked day as 'yyyy-MM-dd', or '' when none is. */
  value: string;
  onChange: (day: string) => void;
  /** The last day that can be picked — today in the business time zone. */
  maxDate: Date;
  error?: string;
  disabled?: boolean;
  testID: string;
}

/**
 * One end of a custom statement period, picked from the app's past-date
 * calendar sheet — the Tamagui stand-in for the MUI X DatePicker mWeb renders
 * for the same box (rule 27). Shown in the admin's date format (rule 11),
 * stored as the 'yyyy-MM-dd' the server takes.
 */
export function StatementDateField({
  label,
  value,
  onChange,
  maxDate,
  error,
  disabled = false,
  testID,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const fmt = useDateFormat();
  const { muted } = useThemeColors();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <Field label={label} required error={error} testID={testID}>
      <PickerTrigger
        testID={testID}
        label={label}
        shown={value ? fmt.formatDay(value) : fmt.datePlaceholder}
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
          <DobCalendarSheet
            testID={testID}
            initial={parseIsoDay(value)}
            muted={muted}
            maxDate={maxDate}
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
