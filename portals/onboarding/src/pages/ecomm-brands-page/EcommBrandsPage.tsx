import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { Alert, Box, MenuItem, Stack, TextField, Typography } from '@mui/material';
import TableSkeleton from '../../components/TableSkeleton';
import { APPROVE_BRAND, ECOMM_BRANDS, REJECT_BRAND, STATUSES } from './queries';
import EcommBrandsTable from './EcommBrandsTable';
import EcommBrandReviewDialog from './EcommBrandReviewDialog';
import EcommBrandEditDialog from './EcommBrandEditDialog';

export default function EcommBrandsPage() {
  const [status, setStatus] = useState('');
  const { data, loading, error, refetch } = useQuery(ECOMM_BRANDS, {
    variables: { status: status || null },
  });
  const [approve] = useMutation(APPROVE_BRAND);
  const [reject] = useMutation(REJECT_BRAND);
  const [active, setActive] = useState<any | null>(null);
  const [editing, setEditing] = useState<any | null>(null);
  const [notes, setNotes] = useState('');
  const [tagsText, setTagsText] = useState('');

  const openReview = (brand: any) => {
    setActive(brand);
    setNotes('');
    setTagsText((brand.tags ?? []).join(', '));
  };
  const parseTags = () => tagsText.split(',').map((tag) => tag.trim()).filter(Boolean);
  const doApprove = async () => {
    await approve({ variables: { id: active.id, notes, tags: parseTags() } });
    setActive(null);
    setNotes('');
    setTagsText('');
    refetch();
  };
  const doReject = async () => {
    if (!notes.trim()) return;
    await reject({ variables: { id: active.id, notes } });
    setActive(null);
    setNotes('');
    setTagsText('');
    refetch();
  };

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Stack spacing={0.25}>
          <Typography variant="h5" fontWeight={700}>E-Commerce Brands</Typography>
          <Typography variant="body2" color="text.secondary">
            Review and verify partner product brands before they go live.
          </Typography>
        </Stack>
        <TextField
          select
          size="small"
          label="Status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          sx={{ minWidth: 180 }}
        >
          {STATUSES.map((s) => (
            <MenuItem key={s} value={s}>
              {s || 'All'}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error.message}</Alert>}

      {loading && !data ? (
        <TableSkeleton columns={6} />
      ) : (
        <EcommBrandsTable brands={data?.ecommBrands ?? []} onEdit={setEditing} onReview={openReview} />
      )}

      <EcommBrandEditDialog
        brand={editing}
        onClose={() => setEditing(null)}
        onSaved={() => refetch()}
      />

      <EcommBrandReviewDialog
        active={active}
        notes={notes}
        setNotes={setNotes}
        tagsText={tagsText}
        setTagsText={setTagsText}
        onClose={() => setActive(null)}
        onApprove={doApprove}
        onReject={doReject}
      />
    </Box>
  );
}
