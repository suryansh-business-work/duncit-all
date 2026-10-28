import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogActions, DialogContent, DialogTitle, Stack } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/app-settings';
import type { TeamStructureInfo } from './types';

export interface TeamFormValues {
  name: string;
  description?: string;
  currency: string;
}

/** The currency a new team starts with; HR can change it per team. */
const DEFAULT_CURRENCY = import.meta.env.VITE_DEFAULT_CURRENCY || 'INR';

interface Props {
  open: boolean;
  team: TeamStructureInfo | null;
  busy: boolean;
  onClose: () => void;
  onSubmit: (values: TeamFormValues) => void;
}

/** Create a team, or rename / re-describe an existing one. */
export default function TeamFormDialog({ open, team, busy, onClose, onSubmit }: Readonly<Props>) {
  const { t } = useTranslation();
  const schema = useMemo(
    () =>
      z.object({
        name: z.string().trim().min(1, t('hr.teamStructure.validation.teamName')).max(120),
        description: z.string().trim().max(500).optional(),
        currency: z.string().trim().length(3, t('hr.teamStructure.validation.currency')),
      }),
    [t],
  );
  const { control, handleSubmit, reset } = useForm<TeamFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', description: '', currency: DEFAULT_CURRENCY },
  });
  useEffect(() => {
    if (open) reset({ name: team?.name ?? '', description: team?.description ?? '', currency: team?.currency ?? DEFAULT_CURRENCY });
  }, [open, team, reset]);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs" aria-labelledby="team-form-title">
      <form noValidate onSubmit={handleSubmit(onSubmit)}>
        <DialogTitle id="team-form-title">{t(team ? 'hr.teamStructure.form.editTitle' : 'hr.teamStructure.form.createTitle')}</DialogTitle>
        <DialogContent>
          <Stack spacing={1} sx={{ pt: 1 }}>
            <RhfTextField control={control} name="name" label={t('hr.teamStructure.form.name')} required />
            <RhfTextField control={control} name="description" label={t('hr.teamStructure.form.description')} multiline minRows={2} />
            <RhfTextField control={control} name="currency" label={t('hr.teamStructure.form.currency')} hint={t('hr.teamStructure.form.currencyHint')} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <DuncitButton onClick={onClose}>{t('shell.common.cancel')}</DuncitButton>
          <DuncitButton type="submit" variant="contained" disabled={busy}>{t('shell.common.save')}</DuncitButton>
        </DialogActions>
      </form>
    </Dialog>
  );
}
