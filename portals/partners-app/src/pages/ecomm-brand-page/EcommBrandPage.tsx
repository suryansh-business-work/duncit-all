import { useMemo, useRef, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { Alert, Box, Button, Card, CardContent, Chip, Snackbar, Stack, Typography } from '@mui/material';
import MediaPickerDialog from '../../components/MediaPickerDialog';
import EcommBrandForm from './EcommBrandForm';
import { MY_BRAND, SAVE_BRAND, SUBMIT_BRAND, WITHDRAW_BRAND, type EcommBrand } from './queries';
import { toFormValues, toSaveInput, type BrandFormValues } from './schema';

export default function EcommBrandPage() {
  const { data, loading, refetch } = useQuery(MY_BRAND, { fetchPolicy: 'cache-and-network' });
  const [saveBrand, saveState] = useMutation(SAVE_BRAND);
  const [submitBrand, submitState] = useMutation(SUBMIT_BRAND);
  const [withdrawBrand, withdrawState] = useMutation(WITHDRAW_BRAND);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerResolve = useRef<((url: string | null) => void) | null>(null);

  const brand: EcommBrand | null = data?.myEcommBrand ?? null;
  const accountEmail = data?.me?.email || '';
  const status = brand?.status;
  const locked = status === 'SUBMITTED' || status === 'APPROVED';
  const busy = saveState.loading || submitState.loading || withdrawState.loading;
  // Memoised so typing (which doesn't change `data`) never resets the form.
  const defaultValues = useMemo(() => toFormValues(brand, accountEmail), [brand, accountEmail]);

  const pickImage = () =>
    new Promise<string | null>((resolve) => {
      pickerResolve.current = resolve;
      setPickerOpen(true);
    });
  const settlePicker = (url: string | null) => {
    pickerResolve.current?.(url);
    pickerResolve.current = null;
    setPickerOpen(false);
  };

  const save = async (values: BrandFormValues) => {
    setError(null);
    try {
      await saveBrand({ variables: { input: toSaveInput(values) } });
      setMessage('Brand saved.');
      await refetch();
    } catch (e: any) {
      setError(e.message);
    }
  };
  const submitForReview = async (values: BrandFormValues) => {
    setError(null);
    try {
      await saveBrand({ variables: { input: toSaveInput(values) } });
      await submitBrand();
      setMessage('Brand submitted for review.');
      await refetch();
    } catch (e: any) {
      setError(e.message);
    }
  };
  const withdraw = async () => {
    setError(null);
    try {
      await withdrawBrand();
      setMessage('Brand moved back to draft.');
      await refetch();
    } catch (e: any) {
      setError(e.message);
    }
  };

  if (loading && !data) return <Typography>Loading…</Typography>;

  return (
    <Stack spacing={2.25} sx={{ maxWidth: 760, mx: 'auto', width: '100%' }}>
      <Box sx={{ p: 2.5, borderRadius: 2, color: 'primary.contrastText', background: (t) => `linear-gradient(135deg, ${t.palette.primary.dark} 0%, ${t.palette.primary.main} 100%)` }}>
        <Stack direction="row" alignItems="flex-start" spacing={1.25}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="overline" sx={{ opacity: 0.8, fontWeight: 800 }}>Partner tools</Typography>
            <Typography variant="h4" sx={{ fontWeight: 900, lineHeight: 1.05 }}>E-Commerce Brand</Typography>
            <Typography variant="body2" sx={{ opacity: 0.85, fontWeight: 600, mt: 0.5 }}>
              Register your product brand — our onboarding team verifies it before it goes live.
            </Typography>
          </Box>
          {status && <Chip size="small" label={status} sx={{ bgcolor: status === 'APPROVED' ? 'success.main' : 'rgba(255,255,255,0.2)', color: '#fff', fontWeight: 800 }} />}
        </Stack>
      </Box>

      {status === 'SUBMITTED' && (
        <Alert severity="info" action={<Button color="inherit" size="small" onClick={withdraw} disabled={busy}>Edit</Button>}>
          Your brand is under review.
        </Alert>
      )}
      {status === 'APPROVED' && <Alert severity="success">Approved — your brand is verified.</Alert>}
      {status === 'REJECTED' && <Alert severity="error">Rejected: {brand?.reviewer_notes || 'See notes.'} Update the details and resubmit.</Alert>}
      {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}

      <Card variant="outlined" sx={{ borderRadius: 2 }}>
        <CardContent sx={{ p: { xs: 1.5, sm: 2.5 } }}>
          <EcommBrandForm
            defaultValues={defaultValues}
            busy={busy}
            locked={locked}
            onSave={save}
            onSubmitForReview={submitForReview}
            onPickImage={pickImage}
          />
        </CardContent>
      </Card>

      <MediaPickerDialog
        open={pickerOpen}
        onClose={() => settlePicker(null)}
        onPicked={(url) => settlePicker(url)}
        folder="/brands/media"
        title="Upload brand media"
        accept="image/*,application/pdf"
      />
      <Snackbar open={!!message} autoHideDuration={2500} message={message ?? ''} onClose={() => setMessage(null)} />
    </Stack>
  );
}
