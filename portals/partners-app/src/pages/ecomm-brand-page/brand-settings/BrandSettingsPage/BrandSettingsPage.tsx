import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useMutation, useQuery } from '@apollo/client/react';
import {
  Alert,
  Card,
  CardContent,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Snackbar,
  Stack,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { DuncitIconButton } from '@duncit/buttons';
import { parseApiError } from '@duncit/utils';
import { fireAndForget, logs } from '@duncit/logs';
import { MY_BRANDS, type EcommBrand } from '../../queries';
import {
  WarehouseForm, toSaveWarehouseVariables, warehouseToValues, type WarehouseFormValues,
} from '../warehouse-form';
import WarehouseList from '../WarehouseList';
import { MY_BRAND_WAREHOUSES, SAVE_MY_WAREHOUSE, type BrandWarehouse } from '../warehouse.queries';
import { useTranslation } from '@duncit/shell';
import BrandSettingsHero from './BrandSettingsHero';
import DeleteWarehouseDialog from './DeleteWarehouseDialog';
import WarehouseSync from '../WarehouseSync';
import { usePickupActions } from './usePickupActions';

type Editing = BrandWarehouse | 'new' | null;

/** How long a confirmation stays up. A refusal stays until it is dismissed — it names what to fix. */
const NOTICE_MS = 4000;

/** Full-screen Brand Settings: the brand's pickup addresses with add / edit /
 * delete / make-primary / active-inactive. An approved address is sent to
 * ShipRocket by the server — on approval, and again whenever this page opens
 * (WarehouseSync). */
export default function BrandSettingsPage({
  embedded = false,
  brandId: brandIdProp,
}: Readonly<{
  /** Inside the brand page's Pickup Addresses tab: that page already carries the
   * brand's header and the way back, so this one drops its own hero. */
  embedded?: boolean;
  /** The brand to show when it is not in the URL (the Pickup Addresses page picks it). */
  brandId?: string;
}>) {
  const { t } = useTranslation();
  const { brandId: brandParam = '' } = useParams<{ brandId: string }>();
  const brandId = brandIdProp ?? brandParam;
  const navigate = useNavigate();
  const { data: brandsData, loading: brandsLoading } = useQuery<any>(MY_BRANDS, { fetchPolicy: 'cache-and-network' });
  const { data, loading, error, refetch } = useQuery<any>(MY_BRAND_WAREHOUSES, {
    variables: { brand_doc_id: brandId },
    fetchPolicy: 'cache-and-network',
  });
  const [saveWarehouse, saveState] = useMutation<any>(SAVE_MY_WAREHOUSE);
  const actions = usePickupActions(brandId, refetch);
  const { notice, setNotice } = actions;
  const [editing, setEditing] = useState<Editing>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  const brand: EcommBrand | null =
    brandsData?.myEcommBrands?.find((item: EcommBrand) => item.id === brandId) ?? null;
  const warehouses: BrandWarehouse[] = data?.myBrandPickupLocations ?? [];
  const busy = saveState.loading || actions.busy;
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
      setNotice({ severity: 'success', text: t('partners.ecommBrandPage.warehouseSaved') });
      closeDialog();
      await refetch();
    } catch (saveError) {
      setApiError(parseApiError(saveError));
    }
  };

  if ((brandsLoading && !brandsData) || (loading && !data)) {
    return (
      <Stack sx={{ alignItems: 'center', py: 5 }}>
        <CircularProgress size={24} aria-label={t('shell.a11y.loading')} />
      </Stack>
    );
  }

  return (
    <Stack spacing={2.25} sx={{ width: '100%' }}>
      {!embedded && <BrandSettingsHero brand={brand} onBack={() => navigate('/ecomm-brand')} />}
      {brandMissing && <Alert severity="warning" data-testid="brand-settings-not-found">{t('partners.ecommBrandPage.brandWasNotFoundInYour')}</Alert>}
      {error && !brandMissing && <Alert severity="error">{parseApiError(error)}</Alert>}
      {!brandMissing && (
        <Card variant="outlined" sx={{ borderRadius: 2 }}>
          <CardContent>
            <Stack spacing={2}>
              <Typography variant="h6" component="h2" sx={{ fontWeight: 950 }}>
                {t('partners.ecommBrandPage.warehouses')}
              </Typography>
              <Alert severity="info">{t('partners.warehouses.reviewNotice')}</Alert>
              <WarehouseSync brandId={brandId} onSynced={() => fireAndForget(refetch(), logs.portal['partners-app'], 'BrandSettingsPage', 'refetch')} />
              <WarehouseList
                warehouses={warehouses}
                busy={busy}
                onAdd={() => { setApiError(null); setEditing('new'); }}
                onEdit={(warehouse) => { setApiError(null); setEditing(warehouse); }}
                onDelete={actions.askDelete}
                onSetDefault={actions.makeDefault}
                onToggleActive={actions.toggleActive}
              />
            </Stack>
          </CardContent>
        </Card>
      )}

      <Dialog open={!!editing} onClose={closeDialog} fullWidth maxWidth="sm" aria-labelledby="warehouse-dialog-title">
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
          <span id="warehouse-dialog-title">
            {editingWarehouse ? t('partners.warehouses.editTitle') : t('partners.warehouses.newTitle')}
          </span>
          <DuncitIconButton size="small" onClick={closeDialog} aria-label={t('shell.common.close')}><CloseIcon /></DuncitIconButton>
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

      <DeleteWarehouseDialog
        brandId={brandId}
        target={actions.removal}
        busy={actions.removing}
        onCancel={actions.cancelRemoval}
        onConfirm={actions.confirmRemoval}
      />
      <Snackbar
        open={!!notice}
        autoHideDuration={notice?.severity === 'error' ? null : NOTICE_MS}
        onClose={(_event, reason) => {
          // A refusal is not dismissed by a stray click elsewhere on the page.
          if (reason !== 'clickaway' || notice?.severity !== 'error') setNotice(null);
        }}
      >
        <Alert severity={notice?.severity ?? 'success'} variant="filled" onClose={() => setNotice(null)} sx={{ width: '100%' }}>
          {notice?.text}
        </Alert>
      </Snackbar>
    </Stack>
  );
}
