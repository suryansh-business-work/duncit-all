import { useState } from 'react';
import { YStack } from 'tamagui';
import { hhmmToDate, parseHHMM } from '@duncit/slots';

import { DuncitButton } from '@/components/DuncitButton';
import { DuncitDialog } from '@/components/DuncitDialog';
import { Field } from '@/components/Field';
import { MINUTES, pad2, TimeChipRows } from '@/components/create-pod/TimeChipRows';
import { useDateFormat } from '@/hooks/useDateFormat';
import { useTranslation } from '@/hooks/useTranslation';
import { PickerTrigger } from './PickerTrigger';

interface Props {
  label: string;
  /** 'HH:mm' (24h), or '' for none. */
  value: string;
  onChange: (hhmm: string) => void;
  testID: string;
}

/**
 * A clock time picked from the same hour and quarter-hour chips the create-pod
 * sheet offers — the Tamagui stand-in for MUIX's TimePicker (rule 27). Holds
 * 'HH:mm' because that is what the recurring generator validates against.
 */
export function TimePickerField({ label, value, onChange, testID }: Readonly<Props>) {
  const { t } = useTranslation();
  const fmt = useDateFormat();
  const [open, setOpen] = useState(false);
  const [hour, setHour] = useState(0);
  const [minute, setMinute] = useState(0);

  const openSheet = () => {
    const { hours, minutes } = parseHHMM(value);
    setHour(hours);
    setMinute(MINUTES.includes(minutes) ? minutes : 0);
    setOpen(true);
  };
  const done = () => {
    onChange(`${pad2(hour)}:${pad2(minute)}`);
    setOpen(false);
  };

  const footer = <DuncitButton label={t('mweb.createPod.done')} onPress={done} fullWidth />;

  return (
    <Field label={label} testID={testID}>
      <PickerTrigger
        testID={testID}
        label={label}
        shown={value ? fmt.formatTime(hhmmToDate(value)) : '—'}
        hasValue={!!value}
        icon="schedule"
        onPress={openSheet}
      />
      <DuncitDialog
        open={open}
        onClose={() => setOpen(false)}
        testID={`${testID}-sheet`}
        title={label}
        closeLabel={t('mweb.common.close')}
        variant="center"
        footer={footer}
      >
        <YStack gap={12}>
          <TimeChipRows
            testID={testID}
            hour={hour}
            minute={minute}
            onHour={setHour}
            onMinute={setMinute}
          />
        </YStack>
      </DuncitDialog>
    </Field>
  );
}
