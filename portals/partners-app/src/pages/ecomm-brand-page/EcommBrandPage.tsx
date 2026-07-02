import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@apollo/client';
import { Alert, Box, Button, Card, CardContent, Dialog, DialogContent, DialogTitle, IconButton, Snackbar, Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import MediaPickerDialog from '../../components/MediaPickerDialog';
import EcommBrandForm from './EcommBrandForm';
import PartnerBrandsTable from './PartnerBrandsTable';
import { MY_BRANDS, SAVE_BRAND, SUBMIT_BRAND, WITHDRAW_BRAND, type EcommBrand } from './queries';
import { toFormValues, toSaveInput, type BrandFormValues } from './schema';

type Editing = EcommBrand | 'new' | null;

export default function EcommBrandPage() {
  const navigate = useNavigate();
  const { data, loading, refetch } = useQuery(MY_BRANDS, { fetchPolicy: 'cache-and-network' });
  const [saveBrand, saveState] = useMutation(SAVE_BRAND);
  const [submitBrand, submitState] = useMutation(SUBMIT_BRAND);
  const [withdrawBrand, withdrawState] = useMutation(WITHDRAW_BRAND);
  const [editing, setEditing] = useState<Editing>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerResolve = useRef<((url: string | null) => void) | null>(null);

  const brands: EcommBrand[] = data?.myEcommBrands ?? [];
  const accountEmail = data?.me?.email || '';
  const busy = saveState.loading || submitState.loading || withdrawState.loading;

  const editingBrand = editing && editing !== 'new' ? editing : null;
  const brandId = editingBrand?.id;
  const locked = editingBrand?.status === 'SUBMITTED' || editingBrand?.status === 'APPROVED';
  const defaultValues = useMemo(() => toFormValues(editingBrand, accountEmail), [editingBrand, accountEmail]);

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
  const closeDialog = () => {
    setEditing(null);
    setError(null);
  };

  const save = async (values: BrandFormValues) => {
    setError(null);
    try {
      await saveBrand({ variables: { brand_doc_id: brandId ?? null, input: toSaveInput(values) } });
      setMessage('Brand saved.');
      closeDialog();
      await refetch();
    } catch (e: any) {
      setError(e.message);
    }
  };
  const submitForReview = async (values: BrandFormValues) => {
    setError(null);
    try {
      const res = await saveBrand({ variables: { brand_doc_id: brandId ?? null, input: toSaveInput(values) } });
      const id = brandId ?? res.data?.saveEcommBrand?.id;
      await submitBrand({ variables: { brand_doc_id: id } });
      setMessage('Brand submitted for review.');
      closeDialog();
      await refetch();
    } catch (e: any) {
      setError(e.message);
    }
  };
  const withdraw = async (brand: EcommBrand) => {
    setError(null);
    try {
      await withdrawBrand({ variables: { brand_doc_id: brand.id } });
      setEditing({ ...brand, status: 'DRAFT' }); // unlock the form in place
      setMessage('Brand moved back to draft.');
      await refetch();
    } catch (e: any) {
      setError(e.message);
    }
  };

  if (loading && !data) return <Typography>Loading…</Typography>;

  return (
    <Stack spacing={2.25} sx={{ width: '100%' }}>
      <Box sx={{ p: 2.5, borderRadius: 2, color: 'primary.contrastText', background: (t) => `linear-gradient(135deg, ${t.palette.primary.dark} 0%, ${t.palette.primary.main} 100%)` }}>
        <Typography variant="overline" sx={{ opacity: 0.8, fontWeight: 800 }}>Partner tools</Typography>
        <Typography variant="h4" sx={{ fontWeight: 900, lineHeight: 1.05 }}>E-Commerce Brands</Typography>
        <Typography variant="body2" sx={{ opacity: 0.85, fontWeight: 600, mt: 0.5 }}>
          Register one or more product brands — our onboarding team verifies each before it goes live.
        </Typography>
      </Box>

      {error && !editing && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}

      <Card variant="outlined" sx={{ borderRadius: 2 }}>
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Typography variant="h6" fontWeight={900}>Your brands</Typography>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setError(null); setEditing('new'); }}>
              New brand
            </Button>
          </Stack>
          <PartnerBrandsTable
            brands={brands}
            onOpen={(brand) => { setError(null); setEditing(brand); }}
            onManageProducts={(brand) => navigate(`/ecomm-brand/${brand.id}/products`)}
          />
        </CardContent>
      </Card>

      <Dialog open={!!editing} onClose={closeDialog} fullWidth maxWidth="sm">
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
          <span>{editing === 'new' ? 'New brand' : locked ? 'Brand details' : 'Edit brand'}</span>
          <IconButton size="small" onClick={closeDialog} aria-label="Close"><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {editingBrand?.status === 'SUBMITTED' && (
            <Alert severity="info" sx={{ mb: 2 }} action={<Button color="inherit" size="small" onClick={() => withdraw(editingBrand)} disabled={busy}>Edit</Button>}>
              This brand is under review.
            </Alert>
          )}
          {editingBrand?.status === 'APPROVED' && <Alert severity="success" sx={{ mb: 2 }}>Approved — your brand is verified.</Alert>}
          {editingBrand?.status === 'REJECTED' && <Alert severity="error" sx={{ mb: 2 }}>Rejected: {editingBrand.reviewer_notes || 'See notes.'} Update and resubmit.</Alert>}
          {error && editing && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
          <EcommBrandForm
            key={editingBrand?.id ?? 'new'}
            defaultValues={defaultValues}
            busy={busy}
            locked={locked}
            onSave={save}
            onSubmitForReview={submitForReview}
            onPickImage={pickImage}
          />
        </DialogContent>
      </Dialog>

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
