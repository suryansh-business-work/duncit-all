import { useApolloClient } from '@apollo/client/react';
import { useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { Alert, Box, Stack, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import { useApolloTableFetch } from '@duncit/table';
import BrandsReviewTable from './BrandsReviewTable';
import ReviewBrandDialog from './ReviewBrandDialog';
import { ECOMM_BRANDS_TABLE, type EcommBrandRow } from './queries';

/** Opens on what needs reviewing; ALL keeps the whole history reachable. */
const STATUS_TABS = ['SUBMITTED', 'APPROVED', 'REJECTED', 'DRAFT', 'ALL'];

export default function BrandsReviewPage() {
  const navigate = useNavigate();
  const client = useApolloClient();
  const refetchRef = useRef<(() => void) | null>(null);
  const [status, setStatus] = useState('SUBMITTED');
  const [message, setMessage] = useState<string | null>(null);
  const [reviewTarget, setReviewTarget] = useState<EcommBrandRow | null>(null);

  // `ecommBrandsTable` is unscoped — every brand at every status, deactivated
  // included. `marketplaceBrandsTable` is APPROVED+active only, which is right
  // for the storefront and wrong for an approval queue: it hid every brand a
  // partner had just submitted.
  const fetchRows = useApolloTableFetch<EcommBrandRow>(
    client,
    ECOMM_BRANDS_TABLE,
    'ecommBrandsTable',
    {
      extraFilters: status === 'ALL' ? [] : [{ field: 'status', op: 'eq', value: status }],
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
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{
        justifyContent: "space-between"
      }}>
        <Box>
          <Typography variant="h4" sx={{
            fontWeight: 950
          }}>
            Brands Review
          </Typography>
          <Typography sx={{
            color: "text.secondary"
          }}>
            Approve or reject the e-commerce brands partners submit for onboarding.
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

      {message && (
        <Alert severity="success" onClose={() => setMessage(null)}>
          {message}
        </Alert>
      )}

      <BrandsReviewTable
        fetchRows={fetchRows}
        refetchRef={refetchRef}
        onView={(b) => navigate(`/ecomm/brands/${b.id}`)}
        onReview={setReviewTarget}
      />

      <ReviewBrandDialog
        brand={reviewTarget}
        onClose={() => setReviewTarget(null)}
        onDone={handleReviewed}
      />
    </Stack>
  );
}
