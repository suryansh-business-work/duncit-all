import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@apollo/client';
import {
  Alert, Box, Button, Card, CardContent, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, IconButton, Snackbar, Stack, Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CloseIcon from '@mui/icons-material/Close';
import { parseApiError } from '@duncit/utils';
import { MY_BRANDS, type EcommBrand } from '../queries';
import {
  WarehouseForm, toSaveWarehouseVariables, warehouseToValues, type WarehouseFormValues,
} from './warehouse-form';
import WarehouseList from './WarehouseList';
import {
  DELETE_MY_WAREHOUSE, MY_BRAND_WAREHOUSES, SAVE_MY_WAREHOUSE, SET_DEFAULT_MY_WAREHOUSE,
  type BrandWarehouse,
} from './warehouse.queries';
import { useTranslation } from '@duncit/shell';

type Editing = BrandWarehouse | 'new' | null;

/** Full-screen Brand Settings: the brand's warehouses (pickup locations) with
 * add/edit/delete/set-default. ShipRocket registration stays admin-side — a
 * pending warehouse ships with the manual delivery charge until registered. */
export default function BrandSettingsPage() {
  const { t } = useTranslation();
  const { brandId = '' } = useParams<{ brandId: string }>();
  const navigate = useNavigate();
  const { data: brandsData, loading: brandsLoading } = useQuery(MY_BRANDS, { fetchPolicy: 'cache-and-network' });
  const { data, loading, error, refetch } = useQuery(MY_BRAND_WAREHOUSES, {
    variables: { brand_doc_id: brandId },
    fetchPolicy: 'cache-and-network',
  });
  const [saveWarehouse, saveState] = useMutation(SAVE_MY_WAREHOUSE);
  const [deleteWarehouse, deleteState] = useMutation(DELETE_MY_WAREHOUSE);
  const [setDefaultWarehouse, defaultState] = useMutation(SET_DEFAULT_MY_WAREHOUSE);
  const [editing, setEditing] = useState<Editing>(null);
  const [deleteTarget, setDeleteTarget] = useState<BrandWarehouse | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const brand: EcommBrand | null =
    brandsData?.myEcommBrands?.find((item: EcommBrand) => item.id === brandId) ?? null;
  const warehouses: BrandWarehouse[] = data?.myBrandPickupLocations ?? [];
  const busy = saveState.loading || deleteState.loading || defaultState.loading;
  const editingWarehouse = editing && editing !== 'new' ? editing : null;
  const defaultValues = useMemo(() => warehouseToValues(editingWarehouse), [editingWarehouse]);
  const brandMissing = !brandsLoading && brandsData && !brand;

  const closeDialog = () => {
    setEditing(null);
    setApiError(null);
  };
  const save = async (values: WarehouseFormValues) => {
    setApiError(null);
    try {
      await saveWarehouse({
        variables: toSaveWarehouseVariables(brandId, editingWarehouse?.id ?? null, values),
      });
      setMessage(t('partners.ecommBrandPage.warehouseSaved'));
      closeDialog();
      await refetch();
    } catch (saveError) {
      setApiError(parseApiError(saveError));
    }
  };
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteWarehouse({ variables: { brand_doc_id: brandId, id: deleteTarget.id } });
      setMessage(t('partners.ecommBrandPage.warehouseDeleted'));
      await refetch();
    } catch (deleteError) {
      setMessage(parseApiError(deleteError));
    }
    setDeleteTarget(null);
  };
  const makeDefault = async (warehouse: BrandWarehouse) => {
    try {
      await setDefaultWarehouse({ variables: { brand_doc_id: brandId, id: warehouse.id } });
      setMessage(`${warehouse.nickname} is now the default warehouse.`);
      await refetch();
    } catch (defaultError) {
      setMessage(parseApiError(defaultError));
    }
  };

  if ((brandsLoading && !brandsData) || (loading && !data)) {
    return (
      <Stack
        sx={{
          alignItems: "center",
          py: 5
        }}>
        <CircularProgress size={24} />
      </Stack>
    );
  }

  return (
    <Stack spacing={2.25} sx={{ width: '100%' }}>
      <Box
        sx={{
          p: 2.5, borderRadius: 2, color: 'primary.contrastText',
          background: (t) => `linear-gradient(135deg, ${t.palette.primary.dark} 0%, ${t.palette.primary.main} 100%)`,
        }}
      >
        <Button
          onClick={() => navigate('/ecomm-brand')}
          startIcon={<ArrowBackIcon />}
          variant="outlined"
          sx={{ color: 'inherit', borderColor: 'rgba(255,255,255,0.55)' }}
        >
          {t('partners.venueAvailabilityPage.back')}
        </Button>
        <Typography
          variant="h4"
          sx={{
            fontWeight: 950,
            mt: 1
          }}>
          {brand?.brand_name || 'Brand'} settings
        </Typography>
        <Typography variant="body2" sx={{ opacity: 0.85, fontWeight: 600, mt: 0.5 }}>
          Warehouses your products ship from. Orders pick up from the warehouse chosen on each product.
        </Typography>
      </Box>
      {brandMissing && <Alert severity="warning">{t('partners.ecommBrandPage.brandWasNotFoundInYour')}</Alert>}
      {error && !brandMissing && <Alert severity="error">{parseApiError(error)}</Alert>}
      {!brandMissing && (
        <Card variant="outlined" sx={{ borderRadius: 2 }}>
          <CardContent>
            <Stack spacing={2}>
              <Typography variant="h6" sx={{
                fontWeight: 950
              }}>{t('partners.ecommBrandPage.warehouses')}</Typography>
              <Alert severity="info">
                Every new warehouse — and every edit to an existing one — is reviewed by the Duncit team.
                A product can only be listed against an approved warehouse, so saving changes here sends
                it back for review.
              </Alert>
              <WarehouseList
                warehouses={warehouses}
                busy={busy}
                onAdd={() => { setApiError(null); setEditing('new'); }}
                onEdit={(warehouse) => { setApiError(null); setEditing(warehouse); }}
                onDelete={setDeleteTarget}
                onSetDefault={makeDefault}
              />
            </Stack>
          </CardContent>
        </Card>
      )}

      <Dialog open={!!editing} onClose={closeDialog} fullWidth maxWidth="sm">
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
          <span>{editingWarehouse ? 'Edit warehouse' : 'New warehouse'}</span>
          <IconButton size="small" onClick={closeDialog} aria-label={t('shell.common.close')}><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <WarehouseForm
            key={editingWarehouse?.id ?? 'new'}
            defaultValues={defaultValues}
            busy={saveState.loading}
            apiError={apiError}
            onSave={save}
            onCancel={closeDialog}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} fullWidth maxWidth="xs">
        <DialogTitle>{t('partners.ecommBrandPage.deleteWarehouse')}</DialogTitle>
        <DialogContent>
          <Typography>
            {deleteTarget?.nickname} will be removed. Products still shipping from it must be moved first.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>{t('shell.common.cancel')}</Button>
          <Button color="error" variant="contained" disabled={deleteState.loading} onClick={confirmDelete}>
            {t('shell.common.delete')}
          </Button>
        </DialogActions>
      </Dialog>
      <Snackbar open={!!message} autoHideDuration={3000} message={message ?? ''} onClose={() => setMessage(null)} />
    </Stack>
  );
}
