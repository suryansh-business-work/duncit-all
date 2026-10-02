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
import RunHistoryDialog from './RunHistoryDialog';
import ScheduleFields from './ScheduleFields';
import ScheduleSummary from './ScheduleSummary';
import { MAX_RETENTION_DAYS, MIN_RETENTION_DAYS } from './schema';
import { useAccountDeletionSettings } from './useAccountDeletionSettings';

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
  const {
    t,
    can,
    historyOpen,
    setHistoryOpen,
    loading,
    running,
    current,
    dueCount,
    control,
    register,
    errors,
    isSubmitting,
    enabled,
    weekly,
    submit,
    runSweep,
  } = useAccountDeletionSettings(onToast);

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
