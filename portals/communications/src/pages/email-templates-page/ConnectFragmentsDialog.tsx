import { useEffect, useState } from 'react';
import { useMutation } from '@apollo/client/react';
import {
  Alert,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/app-settings';
import { CONNECT_FRAGMENTS, type FragmentOption, type FragmentPlanRow } from './queries';

interface ConnectResult {
  connectEmailTemplateFragments: { connected: number; rows: FragmentPlanRow[] };
}

interface Props {
  open: boolean;
  fragmentOptions: FragmentOption[];
  onClose: () => void;
  onDone: (connected: number) => void;
  onError: (message: string) => void;
}

const count = (rows: FragmentPlanRow[], ...actions: FragmentPlanRow['action'][]) =>
  rows.filter((row) => actions.includes(row.action)).length;

/**
 * "Connect header & footer" — wraps every template that would send bare in its
 * fragment. Opens on a dry run, so the admin sees what changes before anything
 * is written; an admin's own (unshipped) templates only move when a fragment is
 * picked for them.
 */
export default function ConnectFragmentsDialog({ open, fragmentOptions, onClose, onDone, onError }: Readonly<Props>) {
  const { t } = useTranslation();
  const [plan, setPlan] = useState<FragmentPlanRow[] | null>(null);
  const [fallback, setFallback] = useState('');
  const [connect, { loading }] = useMutation<ConnectResult>(CONNECT_FRAGMENTS);

  useEffect(() => {
    if (!open) return;
    setPlan(null);
    setFallback('');
    connect({ variables: { dry_run: true } })
      .then((res) => setPlan(res.data?.connectEmailTemplateFragments.rows ?? []))
      .catch((error: Error) => {
        onError(t('tech.emailTemplates.connectFragmentsFailed', { vars: { reason: error.message } }));
        onClose();
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one dry run per opening
  }, [open]);

  const unmapped = plan ? count(plan, 'skipped') : 0;
  const pending = plan ? count(plan, 'linked', 'stripped') + (fallback ? unmapped : 0) : 0;
  const missing = plan?.filter((row) => row.action === 'no-fragment') ?? [];

  const apply = async () => {
    try {
      const res = await connect({ variables: { fallback_key: fallback || null, dry_run: false } });
      onDone(res.data?.connectEmailTemplateFragments.connected ?? 0);
    } catch (error) {
      onError(
        t('tech.emailTemplates.connectFragmentsFailed', {
          vars: { reason: error instanceof Error ? error.message : String(error) },
        })
      );
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" aria-labelledby="connect-fragments-title">
      <DialogTitle id="connect-fragments-title">{t('tech.emailTemplates.connectFragments')}</DialogTitle>
      <DialogContent>
        {plan ? (
          <Stack spacing={2} sx={{ pt: 1 }} aria-live="polite">
            <Typography variant="body2">
              {pending
                ? t('tech.emailTemplates.connectFragmentsSummary', {
                    vars: { pending, already: count(plan, 'already') },
                  })
                : t('tech.emailTemplates.connectFragmentsAllSet')}
            </Typography>
            {unmapped > 0 && (
              <>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  {t('tech.emailTemplates.connectFragmentsUnmapped', { vars: { count: unmapped } })}
                </Typography>
                <TextField
                  select
                  size="small"
                  label={t('tech.emailTemplates.connectFragmentsFallback')}
                  value={fallback}
                  onChange={(e) => setFallback(e.target.value)}
                >
                  <MenuItem value="">{t('tech.emailTemplates.connectFragmentsLeave')}</MenuItem>
                  {fragmentOptions.map((option) => (
                    <MenuItem key={option.key} value={option.key}>
                      {option.name}
                    </MenuItem>
                  ))}
                </TextField>
              </>
            )}
            {missing.length > 0 && (
              <Alert severity="warning">
                {t('tech.emailTemplates.connectFragmentsMissing', {
                  vars: { count: missing.length, slugs: missing.map((row) => row.slug).join(', ') },
                })}
              </Alert>
            )}
          </Stack>
        ) : (
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', py: 2 }} role="status">
            <CircularProgress size={20} aria-hidden />
            <Typography variant="body2">{t('tech.emailTemplates.connectFragmentsChecking')}</Typography>
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <DuncitButton onClick={onClose}>{t('shell.common.cancel')}</DuncitButton>
        <DuncitButton variant="contained" onClick={apply} disabled={!plan || pending === 0 || loading}>
          {t('tech.emailTemplates.connectFragmentsApply')}
        </DuncitButton>
      </DialogActions>
    </Dialog>
  );
}
