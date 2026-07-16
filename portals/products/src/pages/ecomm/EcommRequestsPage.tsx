import { useApolloClient } from '@apollo/client';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { useApolloTableFetch } from '@duncit/table';
import EcommRequestsTable from './EcommRequestsTable';
import ReviewListingDialog from './ReviewListingDialog';
import { PRODUCT_LISTING_REQUESTS_TABLE, type ProductListingRow } from './requestsQueries';

const STATUS_TABS = ['PENDING', 'APPROVED', 'DENIED', 'ALL'];

export default function EcommRequestsPage() {
  const client = useApolloClient();
  const refetchRef = useRef<(() => void) | null>(null);
  const [status, setStatus] = useState('PENDING');
  const [message, setMessage] = useState<string | null>(null);
  const [reviewTarget, setReviewTarget] = useState<ProductListingRow | null>(null);

  const fetchRows = useApolloTableFetch<ProductListingRow>(
    client,
    PRODUCT_LISTING_REQUESTS_TABLE,
    'productListingRequestsTable',
    {
      extraFilters:
        status === 'ALL' ? [] : [{ field: 'listing_review_status', op: 'eq', value: status }],
    },
    [status],
  );

  // Reload the table when the status toggle changes (skip the mount fetch —
  // DuncitTable already fetches on mount).
  const appliedStatusRef = useRef(status);
  useEffect(() => {
    if (appliedStatusRef.current === status) return;
    appliedStatusRef.current = status;
    refetchRef.current?.();
  }, [status]);

  const handleReviewed = (text: string) => {
    setReviewTarget(null);
    setMessage(text);
    refetchRef.current?.();
  };

  return (
    <Stack spacing={2.5}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={2}>
        <Box>
          <Typography variant="h4" fontWeight={950}>
            Ecomm Requests
          </Typography>
          <Typography color="text.secondary">
            Review partner product listings before they become selectable in pods.
          </Typography>
        </Box>
        <ToggleButtonGroup
          exclusive
          size="small"
          value={status}
          onChange={(_, value) => value && setStatus(value)}
        >
          {STATUS_TABS.map((item) => (
            <ToggleButton key={item} value={item}>
              {item}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Stack>

      {message && <Alert severity="success" onClose={() => setMessage(null)}>{message}</Alert>}

      <EcommRequestsTable
        fetchRows={fetchRows}
        refetchRef={refetchRef}
        onReview={setReviewTarget}
      />

      <ReviewListingDialog
        row={reviewTarget}
        onClose={() => setReviewTarget(null)}
        onDone={handleReviewed}
      />
    </Stack>
  );
}
