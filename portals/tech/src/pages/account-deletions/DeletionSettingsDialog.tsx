import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery } from '@apollo/client/react';
import {
  Alert,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { notifyError, notifySuccess } from '@duncit/dialogs';
import { useTranslation } from '@duncit/app-settings';
import { ACCOUNT_DELETION_SETTINGS, UPDATE_ACCOUNT_DELETION_SETTINGS } from './queries';

const MIN_DAYS = 1;
const MAX_DAYS = 365;

const schema = z.object({
  retention_days: z.coerce.number().int().min(MIN_DAYS).max(MAX_DAYS),
});

type Values = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
}

/**
 * How long an account survives its owner asking for it to go.
 *
 * One number, and it is a promise rather than a preference: both apps say it
 * out loud before anybody confirms, and the date it produces is stamped on the
 * request. Changing it therefore only reaches requests filed AFTERWARDS —
 * moving somebody's deletion date under them is the one thing a grace period
 * exists to prevent.
 */
export default function DeletionSettingsDialog({ open, onClose }: Readonly<Props>) {
  const { t } = useTranslation();
  const { data } = useQuery<any>(ACCOUNT_DELETION_SETTINGS, { fetchPolicy: 'cache-and-network' });
  const [save, { loading }] = useMutation<any>(UPDATE_ACCOUNT_DELETION_SETTINGS, {
    refetchQueries: [{ query: ACCOUNT_DELETION_SETTINGS }],
  });

  const current = data?.accountDeletionSettings?.retention_days;
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<Values, any, Values>({ resolver: zodResolver(schema), values: { retention_days: current ?? 0 } });

  // The dialog is mounted for the life of the page, so a re-open has to re-seed
  // from the server rather than keep whatever was half-typed last time.
  useEffect(() => {
    if (open && current !== undefined) reset({ retention_days: current });
  }, [open, current, reset]);

  const submit = handleSubmit(async (values) => {
    try {
      await save({ variables: { retention_days: values.retention_days } });
      notifySuccess(t('tech.accountDeletions.settingsSaved'));
      onClose();
    } catch (e) {
      notifyError(e instanceof Error ? e.message : String(e));
    }
  });

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ fontWeight: 800 }}>
        {t('tech.accountDeletions.settingsTitle')}
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {t('tech.accountDeletions.settingsIntro')}
          </Typography>
          <TextField
            autoFocus
            fullWidth
            size="small"
            type="number"
            label={t('tech.accountDeletions.retentionDays')}
            helperText={
              errors.retention_days
                ? t('tech.accountDeletions.retentionRange')
                : t('tech.accountDeletions.retentionHint')
            }
            error={!!errors.retention_days}
            slotProps={{ htmlInput: { min: MIN_DAYS, max: MAX_DAYS, 'data-testid': 'retention-days' } }}
            {...register('retention_days')}
          />
          <Alert severity="info">{t('tech.accountDeletions.settingsAppliesNext')}</Alert>
        </Stack>
      </DialogContent>
      <DialogActions>
        <DuncitButton onClick={onClose}>{t('tech.accountDeletions.close')}</DuncitButton>
        <DuncitButton
          variant="contained"
          disabled={loading}
          onClick={() => {
            submit().catch(() => undefined);
          }}
          data-testid="save-retention"
        >
          {t('tech.accountDeletions.settingsSave')}
        </DuncitButton>
      </DialogActions>
    </Dialog>
  );
}
