import { useState } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@apollo/client/react';
import {
  Alert,
  Box,
  Card,
  CardContent,
  Divider,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import HistoryIcon from '@mui/icons-material/History';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import SaveIcon from '@mui/icons-material/Save';
import { DuncitButton } from '@duncit/buttons';
import { notifyError, useConfirm } from '@duncit/dialogs';
import { useSession, useTranslation } from '@duncit/app-settings';
import RunHistoryDialog from './RunHistoryDialog';
import ScheduleFields from './ScheduleFields';
import ScheduleSummary from './ScheduleSummary';
import {
  MAX_RETENTION_DAYS,
  MIN_RETENTION_DAYS,
  deletionSettingsSchema,
  type DeletionSettingsValues,
} from './schema';
import {
  ACCOUNT_DELETION_CRON,
  RUN_DELETION_PURGE_NOW,
  UPDATE_ACCOUNT_DELETION_CRON,
  UPDATE_RETENTION_DAYS,
  type CronSettings,
} from './queries';

interface Props {
  onToast: (message: string) => void;
}

/**
 * Account deletion — the grace period, and the job that acts on it.
 *
 * 30 days is a DEFAULT, not a rule: it is stored, it is quoted to the member
 * before they confirm, and it is stamped on their request so that changing it
 * here only ever reaches the next person to ask. The schedule sits in the same
 * card because a window nothing acts on at the end of is not a window — it is
 * a queue that grows.
 *
 * Both halves are SUPER_ADMIN only. Switching the sweep on hands irreversible
 * deletions to a timer, and Run now carries them out on the spot.
 */
export default function AccountDeletionSection({ onToast }: Readonly<Props>) {
  const { t } = useTranslation();
  const { can } = useSession();
  const confirm = useConfirm();
  const [historyOpen, setHistoryOpen] = useState(false);
  const { data, loading, refetch } = useQuery<any>(ACCOUNT_DELETION_CRON, {
    fetchPolicy: 'cache-and-network',
    skip: !can('SUPER_ADMIN'),
  });
  const [saveRetention] = useMutation<any>(UPDATE_RETENTION_DAYS);
  const [saveCron] = useMutation<any>(UPDATE_ACCOUNT_DELETION_CRON);
  const [runNow, { loading: running }] = useMutation<any>(RUN_DELETION_PURGE_NOW);

  const current: CronSettings | undefined = data?.accountDeletionCronSettings;
  const dueCount: number = data?.accountDeletionDueCount ?? 0;

  const {
    control,
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<DeletionSettingsValues, any, DeletionSettingsValues>({
    resolver: zodResolver(deletionSettingsSchema) as unknown as Resolver<DeletionSettingsValues, any, DeletionSettingsValues>,
    // `values` rather than `defaultValues`: the card re-seeds from the server
    // whenever the query answers, so a save elsewhere is not overwritten by a
    // form that hydrated once at mount.
    values: current
      ? {
          retention_days: current.retention_days,
          cron_enabled: current.cron_enabled,
          cron_frequency: current.cron_frequency,
          cron_time_of_day: current.cron_time_of_day,
          cron_weekday: current.cron_weekday,
          cron_batch_size: current.cron_batch_size,
        }
      : undefined,
  });

  const enabled = watch('cron_enabled') ?? false;
  const weekly = watch('cron_frequency') === 'WEEKLY';

  const submit = handleSubmit(async (values) => {
    try {
      // Two mutations because they are two promises. The window is one the
      // product already made to everyone waiting; the schedule is an
      // operational knob. The server keeps them apart so one save can never
      // move the other, and only the half that actually changed is sent.
      if (values.retention_days !== current?.retention_days) {
        await saveRetention({ variables: { retention_days: values.retention_days } });
      }
      await saveCron({
        variables: {
          input: {
            cron_enabled: values.cron_enabled,
            cron_frequency: values.cron_frequency,
            cron_time_of_day: values.cron_time_of_day,
            cron_weekday: values.cron_weekday,
            cron_batch_size: values.cron_batch_size,
          },
        },
      });
      await refetch();
      onToast(t('admin.accountDeletion.saved'));
    } catch (e) {
      notifyError(e instanceof Error ? e.message : String(e));
    }
  });

  const runSweep = async () => {
    const ok = await confirm({
      title: t('admin.accountDeletion.runNowTitle'),
      message: t('admin.accountDeletion.runNowConfirm', { vars: { count: dueCount } }),
      confirmLabel: t('admin.accountDeletion.runNowCta'),
      destructive: true,
    });
    if (!ok) return;
    try {
      const result = await runNow();
      const run = result.data?.runAccountDeletionPurgeNow;
      await refetch();
      onToast(t('admin.accountDeletion.runFinished', { vars: { count: run?.purged ?? 0 } }));
    } catch (e) {
      notifyError(e instanceof Error ? e.message : String(e));
    }
  };

  if (!can('SUPER_ADMIN')) return null;

  return (
    <Card>
      <CardContent>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1}
          sx={{ justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, mb: 2 }}
        >
          <Box>
            <Typography variant="subtitle1">{t('admin.accountDeletion.title')}</Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {t('admin.accountDeletion.intro')}
            </Typography>
          </Box>
          <DuncitButton
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={() => {
              submit().catch(() => undefined);
            }}
            disabled={isSubmitting || loading || !current}
            data-testid="save-deletion-settings"
          >
            {isSubmitting ? t('admin.accountDeletion.saving') : t('admin.accountDeletion.save')}
          </DuncitButton>
        </Stack>

        <Stack spacing={2}>
          <TextField
            size="small"
            type="number"
            label={t('admin.accountDeletion.retentionDays')}
            sx={{ maxWidth: 260 }}
            error={!!errors.retention_days}
            helperText={
              errors.retention_days
                ? t('admin.accountDeletion.retentionRange')
                : t('admin.accountDeletion.retentionHint')
            }
            slotProps={{
              // The form seeds from `values` once the query answers, and
              // `register` writes that number straight to the DOM node — MUI
              // never re-reads it, so without this the label sits on top of the
              // value it is meant to name.
              inputLabel: { shrink: true },
              htmlInput: {
                min: MIN_RETENTION_DAYS,
                max: MAX_RETENTION_DAYS,
                step: 1,
                'data-testid': 'retention-days',
              },
            }}
            {...register('retention_days')}
          />
          <Alert severity="info">{t('admin.accountDeletion.retentionAppliesNext')}</Alert>

          <Divider />

          <ScheduleFields
            register={register}
            control={control}
            errors={errors}
            weekly={weekly}
            enabled={enabled}
          />

          <Divider />

          <ScheduleSummary settings={current} dueCount={dueCount} />

          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
            <DuncitButton
              variant="outlined"
              color="error"
              startIcon={<PlayArrowIcon />}
              onClick={() => {
                runSweep().catch(() => undefined);
              }}
              disabled={running || dueCount === 0}
              data-testid="run-deletion-sweep"
              sx={{ textTransform: 'none' }}
            >
              {running ? t('admin.accountDeletion.running') : t('admin.accountDeletion.runNowCta')}
            </DuncitButton>
            <DuncitButton
              startIcon={<HistoryIcon />}
              onClick={() => setHistoryOpen(true)}
              data-testid="open-deletion-runs"
              sx={{ textTransform: 'none' }}
            >
              {t('admin.accountDeletion.runsTitle')}
            </DuncitButton>
          </Stack>
        </Stack>

        <RunHistoryDialog open={historyOpen} onClose={() => setHistoryOpen(false)} />
      </CardContent>
    </Card>
  );
}
