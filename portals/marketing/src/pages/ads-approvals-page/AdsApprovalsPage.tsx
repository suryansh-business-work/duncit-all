import { useCallback, useEffect, useRef, useState } from 'react';
import { useApolloClient, useMutation } from '@apollo/client';
import { Box, Stack, Typography } from '@mui/material';
import CampaignIcon from '@mui/icons-material/Campaign';
import { useApolloTableFetch } from '@duncit/table';
import { useDateFormat } from '@duncit/app-settings';
import { notifySuccess } from '@duncit/dialogs';
import { ADS_TABLE, REVIEW_AD_REQUEST } from './queries';
import type { AdRequestRow, AdStoredStatus } from './helpers';
import AdsApprovalsToolbar from './AdsApprovalsToolbar';
import AdsApprovalsTable from './AdsApprovalsTable';
import ReviewDialog from './ReviewDialog';

export default function AdsApprovalsPage() {
  const [status, setStatus] = useState<'' | AdStoredStatus>('PENDING');
  const [active, setActive] = useState<AdRequestRow | null>(null);
  const [opError, setOpError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const { formatDateTime } = useDateFormat();

  const client = useApolloClient();
  const refetchRef = useRef<(() => void) | null>(null);
  const [reviewMut] = useMutation(REVIEW_AD_REQUEST);

  // The status toggle lives outside the table (default PENDING), so it is pinned
  // into the query here rather than offered as a column filter.
  const fetchRows = useApolloTableFetch<AdRequestRow>(
    client,
    ADS_TABLE,
    'adRequestsTable',
    { extraFilters: status ? [{ field: 'status', op: 'eq', value: status }] : undefined },
    [status],
  );

  const prevStatusRef = useRef(status);
  useEffect(() => {
    if (prevStatusRef.current === status) return;
    prevStatusRef.current = status;
    refetchRef.current?.();
  }, [status]);

  const openReview = useCallback((row: AdRequestRow) => {
    setOpError(null);
    setActive(row);
  }, []);

  const handleReview = async (id: string, approve: boolean, remarks: string) => {
    setSaving(true);
    setOpError(null);
    try {
      await reviewMut({ variables: { id, approve, remarks: remarks || undefined } });
      notifySuccess(approve ? 'Ad request approved' : 'Ad request rejected');
      setActive(null);
      refetchRef.current?.();
    } catch (e) {
      setOpError(e instanceof Error ? e.message : 'Failed to review ad request');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Stack spacing={2}>
      <Stack direction="row" alignItems="center" spacing={1.5}>
        <CampaignIcon color="primary" />
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Ads Approval
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Review ad requests submitted from the Ads portal. Approval freezes the cost at the
            current pricing.
          </Typography>
        </Box>
      </Stack>

      <AdsApprovalsToolbar status={status} onChange={setStatus} />

      <AdsApprovalsTable fetchRows={fetchRows} refetchRef={refetchRef} onReview={openReview} />

      <ReviewDialog
        request={active}
        saving={saving}
        error={opError}
        formatDateTime={formatDateTime}
        onClose={() => setActive(null)}
        onReview={handleReview}
      />
    </Stack>
  );
}
