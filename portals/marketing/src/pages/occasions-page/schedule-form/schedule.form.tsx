import { useId, useMemo } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dialog, DialogActions, DialogContent, DialogTitle, Stack } from '@mui/material';
import SaveRoundedIcon from '@mui/icons-material/SaveRounded';
import { DuncitButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/app-settings';
import { RhfDateTime, RhfOnOff } from '../rhf-fields';
import {
  scheduleSchema,
  scheduleValues,
  toScheduleInput,
  type ScheduleFormProps,
  type ScheduleFormValues,
} from './schedule.types';

type BodyProps = Omit<ScheduleFormProps, 'look'> & { look: NonNullable<ScheduleFormProps['look']>; titleId: string };

function ScheduleBody({ look, titleId, onClose, onSubmit }: Readonly<BodyProps>) {
  const { t } = useTranslation();
  const schema = useMemo(() => scheduleSchema(t), [t]);
  const { control, handleSubmit, formState } = useForm<ScheduleFormValues, unknown, ScheduleFormValues>({
    defaultValues: scheduleValues(look),
    resolver: zodResolver(schema) as unknown as Resolver<ScheduleFormValues, unknown, ScheduleFormValues>,
    mode: 'onChange',
  });
  const save = async (values: ScheduleFormValues) => {
    if (await onSubmit(look.key, toScheduleInput(values))) onClose();
  };

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        handleSubmit(save)();
      }}
      data-testid="occasion-schedule-form"
    >
      <DialogTitle id={titleId}>{t('marketing.occasions.schedule.dialogTitle', { vars: { name: look.name } })}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <RhfDateTime control={control} name="starts_at" label={t('marketing.occasions.schedule.startsAt')} />
          <RhfDateTime control={control} name="ends_at" label={t('marketing.occasions.schedule.endsAt')} />
          <RhfTextField
            control={control}
            name="sort_order"
            type="number"
            label={t('marketing.occasions.schedule.priority')}
            hint={t('marketing.occasions.schedule.priorityHint')}
          />
          <RhfOnOff
            control={control}
            name="schedule_enabled"
            label={t('marketing.occasions.schedule.enabled')}
            hint={t('marketing.occasions.schedule.enabledHint')}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <DuncitButton onClick={onClose}>{t('shell.common.cancel')}</DuncitButton>
        <DuncitButton
          type="submit"
          variant="contained"
          startIcon={<SaveRoundedIcon />}
          disabled={!formState.isDirty || formState.isSubmitting}
        >
          {t('shell.common.save')}
        </DuncitButton>
      </DialogActions>
    </form>
  );
}

/** A look's date window, its priority and whether the schedule may switch it on. */
export default function ScheduleForm({ look, onClose, onSubmit }: Readonly<ScheduleFormProps>) {
  const titleId = useId();
  return (
    <Dialog open={!!look} onClose={onClose} aria-labelledby={titleId} maxWidth="sm" fullWidth>
      {/* Keyed by the look, so each opens on its own saved window. */}
      {look && <ScheduleBody key={look.key} look={look} titleId={titleId} onClose={onClose} onSubmit={onSubmit} />}
    </Dialog>
  );
}
