import { useQuery } from '@apollo/client/react';
import {
  Alert,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { CLUB_ADMIN_POD_AUDIT_LOGS } from '@duncit/pod-form';
import AuditChangesList from '../../components/club-admin/AuditChangesList';
import AuditEntryCard from '../../components/club-admin/AuditEntryCard';
import type { AuditEntry } from '../../components/club-admin/audit-entry';
import { useTranslation } from '../../i18n/useTranslation';

interface Props {
  pod: { id: string; pod_title: string } | null;
  onClose: () => void;
}

interface BodyProps {
  entries: AuditEntry[];
  loading: boolean;
  error?: { message: string };
}

/** Spinner, error, nothing yet, or the trail — hoisted so it is not redefined. */
function ActivityBody({ entries, loading, error }: Readonly<BodyProps>) {
  const { t } = useTranslation();
  if (error) return <Alert severity="error">{error.message}</Alert>;
  if (loading && entries.length === 0) return <CircularProgress size={22} />;
  if (entries.length === 0) {
    return (
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {t('clubAdmin.pods.noActivity')}
      </Typography>
    );
  }
  return (
    <Stack spacing={1}>
      {entries.map((entry) => (
        <AuditEntryCard key={entry.id} entry={entry}>
          <AuditChangesList changes={entry.changes} note={entry.note} />
        </AuditEntryCard>
      ))}
    </Stack>
  );
}

/**
 * The AI-monitored action trail of one pod — every edit, status change and
 * critical action with the verdict the monitor gave it. Same cards as the Pod
 * Monitoring page, so the two cannot drift.
 */
export default function ClubPodActivityDialog({ pod, onClose }: Readonly<Props>) {
  const { t } = useTranslation();
  const { data, loading, error } = useQuery<any>(CLUB_ADMIN_POD_AUDIT_LOGS, {
    variables: { pod_doc_id: pod?.id },
    skip: !pod,
    fetchPolicy: 'cache-and-network',
  });
  const entries: AuditEntry[] = data?.clubAdminPodAuditLogs ?? [];

  return (
    <Dialog open={!!pod} onClose={onClose} maxWidth="sm" fullWidth>
      {pod && (
        <>
          <DialogTitle sx={{ fontWeight: 800 }}>
            {t('clubAdmin.pods.activity', { vars: { title: pod.pod_title } })}
          </DialogTitle>
          <DialogContent dividers>
            <ActivityBody entries={entries} loading={loading} error={error} />
          </DialogContent>
          <DialogActions>
            <DuncitButton onClick={onClose}>{t('mweb.common.close')}</DuncitButton>
          </DialogActions>
        </>
      )}
    </Dialog>
  );
}
