import { useId, useMemo } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@mui/material';
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';
import { DuncitButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/app-settings';
import {
  duplicateLookSchema,
  type DuplicateLookFormProps,
  type DuplicateLookFormValues,
} from './duplicate-look.types';

type BodyProps = Omit<DuplicateLookFormProps, 'look'> & { look: NonNullable<DuplicateLookFormProps['look']>; titleId: string };

function DuplicateBody({ look, titleId, onClose, onSubmit }: Readonly<BodyProps>) {
  const { t } = useTranslation();
  const schema = useMemo(() => duplicateLookSchema(t), [t]);
  const { control, handleSubmit, formState } = useForm<DuplicateLookFormValues, unknown, DuplicateLookFormValues>({
    defaultValues: { name: t('marketing.occasions.duplicate.defaultName', { vars: { name: look.name } }) },
    resolver: zodResolver(schema) as unknown as Resolver<DuplicateLookFormValues, unknown, DuplicateLookFormValues>,
    mode: 'onChange',
  });
  const save = async ({ name }: DuplicateLookFormValues) => {
    if (await onSubmit(name)) onClose();
  };

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        handleSubmit(save)();
      }}
      data-testid="occasion-duplicate-form"
    >
      <DialogTitle id={titleId}>{t('marketing.occasions.duplicate.title', { vars: { name: look.name } })}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
          {t('marketing.occasions.duplicate.hint')}
        </Typography>
        <RhfTextField control={control} name="name" label={t('marketing.occasions.form.name')} required />
      </DialogContent>
      <DialogActions>
        <DuncitButton onClick={onClose}>{t('shell.common.cancel')}</DuncitButton>
        <DuncitButton type="submit" variant="contained" startIcon={<ContentCopyRoundedIcon />} disabled={formState.isSubmitting}>
          {t('marketing.occasions.duplicate.submit')}
        </DuncitButton>
      </DialogActions>
    </form>
  );
}

/** Name the copy of a look; the copy then opens in the editor. */
export default function DuplicateLookForm({ look, onClose, onSubmit }: Readonly<DuplicateLookFormProps>) {
  const titleId = useId();
  return (
    <Dialog open={!!look} onClose={onClose} aria-labelledby={titleId} maxWidth="xs" fullWidth>
      {/* Keyed by the look, so each copy starts from its own suggested name. */}
      {look && <DuplicateBody key={look.key} look={look} titleId={titleId} onClose={onClose} onSubmit={onSubmit} />}
    </Dialog>
  );
}
