import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { Alert, Box, Chip, Paper, Stack, TextField, Typography } from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import type { IntelApproval } from '@duncit/gql-types';
import { formatDateTime, useTranslation } from '@duncit/app-settings';
import { DuncitButton } from '@duncit/buttons';
import { ConfirmDialog, notifySuccess } from '@duncit/dialogs';
import { parseApiError } from '@duncit/utils';
import { INTEL_DECIDE, type DecideData } from '../../graphql/approvals';
import { ENV_LABEL_KEYS } from '../sources';
import ApprovalPreview from './ApprovalPreview';

const STATUS_COLOR: Record<string, 'default' | 'warning' | 'success' | 'error' | 'info'> = { PENDING: 'warning', EXECUTING: 'info', EXECUTED: 'success', FAILED: 'error', REJECTED: 'default', EXPIRED: 'default' };
const STATUS_KEYS: Record<string, string> = {
  PENDING: 'intel.approval.status.PENDING',
  EXECUTING: 'intel.approval.status.EXECUTING',
  EXECUTED: 'intel.approval.status.EXECUTED',
  FAILED: 'intel.approval.status.FAILED',
  REJECTED: 'intel.approval.status.REJECTED',
  EXPIRED: 'intel.approval.status.EXPIRED',
};

interface Props {
  approval: IntelApproval;
  /** Hide the buttons when this person may not decide (the server re-checks either way). */
  canDecide: boolean;
}

/**
 * A proposed change: environment, target, action, impact and a preview, with
 * Approve / Reject. Production approvals ask once more before running.
 */
export default function ApprovalCard({ approval, canDecide }: Readonly<Props>) {
  const { t } = useTranslation();
  const [note, setNote] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [decide, { loading }] = useMutation<DecideData>(INTEL_DECIDE);
  const production = approval.environment === 'PRODUCTION';
  const pending = approval.status === 'PENDING';

  const run = async (approve: boolean) => {
    setError(null);
    setConfirming(false);
    try {
      await decide({ variables: { id: approval.id, approve, note } });
      notifySuccess(approve ? t('intel.approval.approved') : t('intel.approval.rejected'));
    } catch (err) {
      setError(parseApiError(err, t('intel.approval.decideFailed')));
    }
  };

  return (
    <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, borderColor: production ? 'error.main' : 'warning.main', mt: 1 }} aria-label={t('intel.approval.title')}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', rowGap: 0.5 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          {t('intel.approval.title')}
        </Typography>
        <Chip size="small" color={production ? 'error' : 'warning'} label={t(ENV_LABEL_KEYS[approval.environment] ?? 'intel.env.STAGING')} />
        <Chip size="small" variant="outlined" color={STATUS_COLOR[approval.status] ?? 'default'} label={t(STATUS_KEYS[approval.status] ?? 'intel.approval.status.PENDING')} />
        {approval.tool_class === 'DESTRUCTIVE' && <Chip size="small" color="error" variant="outlined" label={t('intel.approval.destructive')} />}
      </Stack>
      <Box component="dl" sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '140px 1fr' }, columnGap: 1.5, rowGap: 0.5, my: 1, '& dt': { color: 'text.secondary', fontSize: '0.8rem' }, '& dd': { m: 0, fontSize: '0.875rem', wordBreak: 'break-word' } }}>
        <dt>{t('intel.approval.target')}</dt>
        <dd>{[approval.connector_name, approval.database, approval.collection].filter(Boolean).join(' · ')}</dd>
        <dt>{t('intel.approval.action')}</dt>
        <dd>{approval.action}</dd>
        <dt>{t('intel.approval.impact')}</dt>
        <dd>{approval.impact}</dd>
        {approval.reason && (
          <>
            <dt>{t('intel.approval.reason')}</dt>
            <dd>{approval.reason}</dd>
          </>
        )}
        <dt>{t('intel.approval.expires')}</dt>
        <dd>{formatDateTime(approval.expires_at)}</dd>
      </Box>
      {approval.four_eyes && pending && <Alert severity="info" sx={{ mb: 1 }}>{t('intel.approval.fourEyes')}</Alert>}
      {approval.error && <Alert severity="error" sx={{ mb: 1 }}>{approval.error}</Alert>}
      {error && <Alert severity="error" sx={{ mb: 1 }}>{error}</Alert>}
      <ApprovalPreview approval={approval} />
      {pending && canDecide && (
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mt: 1.5, alignItems: { sm: 'center' } }}>
          <TextField size="small" label={t('intel.approval.note')} value={note} onChange={(e) => setNote(e.target.value)} slotProps={{ htmlInput: { maxLength: 500 } }} sx={{ flex: 1 }} />
          <DuncitButton variant="contained" color={production ? 'error' : 'primary'} startIcon={<CheckIcon />} loading={loading || undefined} onClick={() => (production ? setConfirming(true) : run(true))}>
            {t('intel.approval.approve')}
          </DuncitButton>
          <DuncitButton variant="outlined" startIcon={<CloseIcon />} disabled={loading} onClick={() => run(false)}>
            {t('intel.approval.reject')}
          </DuncitButton>
        </Stack>
      )}
      <ConfirmDialog open={confirming} title={t('intel.approval.confirmTitle')} message={t('intel.approval.confirmText', { vars: { impact: approval.impact } })} confirmLabel={t('intel.approval.approve')} destructive busy={loading} onConfirm={() => run(true)} onClose={() => setConfirming(false)} />
    </Paper>
  );
}
