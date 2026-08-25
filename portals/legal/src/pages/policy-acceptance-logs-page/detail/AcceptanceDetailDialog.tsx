import { useState } from 'react';
import { useQuery } from '@apollo/client';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  Typography,
} from '@mui/material';
import { useDateFormat, useTranslation } from '@duncit/app-settings';
import {
  POLICY_ACCEPTANCE_DETAIL,
  type PolicyAcceptanceDetail,
  type PolicyVersionRow,
} from '../../../graphql/policyAcceptance';
import AcceptanceFacts from './AcceptanceFacts';
import AccountPanel from './AccountPanel';
import PolicyPanel from './PolicyPanel';
import VersionHistoryList from './VersionHistoryList';
import AcceptanceTrailList from './AcceptanceTrailList';
import WordingDialog from './WordingDialog';

interface Props {
  /** The row that was clicked; null keeps the dialog closed. */
  acceptanceId: string | null;
  onClose: () => void;
}

/**
 * Everything on file about one acceptance, opened by clicking its row.
 *
 * One query rather than several: the panels are useless apart — "they accepted
 * v2, the policy is now on v4" is a single sentence assembled from four reads,
 * and staging them would show it wrong for a moment on every open.
 */
export default function AcceptanceDetailDialog({ acceptanceId, onClose }: Readonly<Props>) {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat({ timeZoneAware: true });
  const [reading, setReading] = useState<PolicyVersionRow | null>(null);

  const { data, loading, error } = useQuery<{ policyAcceptanceDetail: PolicyAcceptanceDetail }>(
    POLICY_ACCEPTANCE_DETAIL,
    {
      variables: { acceptanceId },
      skip: !acceptanceId,
      fetchPolicy: 'cache-and-network',
    },
  );

  // The formatter takes a Date; every value on the record is an ISO string.
  const when = (iso: string) => (iso ? formatDateTime(new Date(iso)) : '');
  const detail = data?.policyAcceptanceDetail;

  const renderBody = () => {
    if (error) return <Alert severity="error">{t('legalAcceptanceLogs.detail.loadFailed')}</Alert>;
    if (!detail) {
      return (
        <Box sx={{ py: 6, textAlign: 'center' }}>
          <CircularProgress size={24} />
        </Box>
      );
    }
    return (
      <Stack spacing={2.5} divider={<Divider flexItem />}>
        <AcceptanceFacts acceptance={detail.acceptance} formatDateTime={when} />
        <AccountPanel account={detail.account} formatDateTime={when} />
        <PolicyPanel
          policy={detail.policy}
          acceptedHash={detail.acceptance.content_hash}
          formatDateTime={when}
        />
        <VersionHistoryList
          versions={detail.versions}
          acceptedHash={detail.acceptance.content_hash}
          wordingMissing={!detail.accepted_version}
          formatDateTime={when}
          onRead={setReading}
        />
        <AcceptanceTrailList
          heading={t('legalAcceptanceLogs.detail.sectionPolicyHistory')}
          rows={detail.policy_history}
          emptyText={t('legalAcceptanceLogs.detail.noPolicyHistory')}
          currentId={detail.acceptance.id}
          formatDateTime={when}
        />
        <AcceptanceTrailList
          heading={t('legalAcceptanceLogs.detail.sectionUserHistory')}
          rows={detail.user_acceptances}
          emptyText={t('legalAcceptanceLogs.detail.noUserHistory')}
          currentId={detail.acceptance.id}
          formatDateTime={when}
          footnote={t('legalAcceptanceLogs.detail.historyCapped')}
        />
      </Stack>
    );
  };

  return (
    <>
      <Dialog open={!!acceptanceId} onClose={onClose} fullWidth maxWidth="md" scroll="paper">
        <DialogTitle>
          {t('legalAcceptanceLogs.detail.title')}
          <Typography variant="caption" component="div" sx={{
            color: "text.secondary"
          }}>
            {detail?.acceptance.policy_title ?? t('legalAcceptanceLogs.detail.subtitle')}
          </Typography>
        </DialogTitle>
        <DialogContent dividers>{renderBody()}</DialogContent>
        <DialogActions>
          {loading && !!detail && <CircularProgress size={16} sx={{ mr: 1 }} />}
          <Button onClick={onClose}>{t('shell.common.close')}</Button>
        </DialogActions>
      </Dialog>

      <WordingDialog version={reading} onClose={() => setReading(null)} />
    </>
  );
}
