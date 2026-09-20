import { useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { useApolloClient, useMutation } from '@apollo/client/react';
import { Box, Card, CardContent, Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { DuncitButton } from '@duncit/buttons';
import { ConfirmDialog, notifyError, notifySuccess } from '@duncit/dialogs';
import { useApolloTableFetch } from '@duncit/table';
import { parseApiError } from '@duncit/utils';
import { useTranslation } from '@duncit/shell';
import BrandPauseDialog from './BrandPauseDialog';
import PartnerBrandsTable from './PartnerBrandsTable';
import { DELETE_MY_BRAND, MY_BRANDS_TABLE, type EcommBrandRow } from './queries';
import { primaryHeroBackground } from '../../components/primaryHero';

const editPath = (brand: EcommBrandRow) => `/ecomm-brand/${brand.id}/edit`;

/** "Your brands": the table, and the doors into the wizard, products and settings. */
export default function EcommBrandPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const client = useApolloClient();
  const refetchRef = useRef<(() => void) | null>(null);
  const [deleteBrand, deleteState] = useMutation<any>(DELETE_MY_BRAND);
  const [pauseTarget, setPauseTarget] = useState<EcommBrandRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EcommBrandRow | null>(null);

  const fetchRows = useApolloTableFetch<EcommBrandRow>(client, MY_BRANDS_TABLE, 'myEcommBrandsTable');

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteBrand({ variables: { brand_doc_id: deleteTarget.id } });
      notifySuccess(t('partners.brandWizard.danger.deleted'));
      setDeleteTarget(null);
      refetchRef.current?.();
    } catch (error) {
      notifyError(parseApiError(error));
      setDeleteTarget(null);
    }
  };

  return (
    <Stack spacing={2.25} sx={{ width: '100%' }}>
      <Box sx={{ p: 2.5, borderRadius: 2, color: 'common.white', background: primaryHeroBackground }}>
        <Typography variant="overline" sx={{ fontWeight: 800 }}>
          {t('partners.common.partnerTools')}
        </Typography>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 900, lineHeight: 1.05 }}>
          {t('partners.ecommBrandPage.heroTitle')}
        </Typography>
        <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.5 }}>
          {t('partners.ecommBrandPage.heroIntro')}
        </Typography>
      </Box>

      <Card variant="outlined" sx={{ borderRadius: 2 }}>
        <CardContent>
          <Typography variant="h6" component="h2" sx={{ fontWeight: 900, mb: 2 }}>
            {t('partners.ecommBrandPage.yourBrands')}
          </Typography>
          <PartnerBrandsTable
            fetchRows={fetchRows}
            refetchRef={refetchRef}
            toolbarActions={
              <DuncitButton
                size="small"
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => navigate('/ecomm-brand/new')}
                data-testid="brands-new-brand"
              >
                {t('partners.ecommBrandPage.newBrand')}
              </DuncitButton>
            }
            onOpen={(brand) => navigate(editPath(brand))}
            onManageProducts={(brand) => navigate(`/ecomm-brand/${brand.id}/products`)}
            onSettings={(brand) => navigate(`/ecomm-brand/${brand.id}/settings`)}
            onToggleActive={setPauseTarget}
            onDelete={setDeleteTarget}
          />
        </CardContent>
      </Card>

      <BrandPauseDialog
        target={pauseTarget}
        onClose={() => setPauseTarget(null)}
        onDone={(text) => {
          notifySuccess(text);
          refetchRef.current?.();
        }}
      />
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={t('partners.brandWizard.danger.deleteConfirmTitle', {
          vars: { brand: deleteTarget?.brand_name || t('partners.ecommBrandPage.untitledBrand') },
        })}
        message={t('partners.brandWizard.danger.deleteConfirmBody')}
        destructive
        busy={deleteState.loading}
        busyLabel={t('shell.common.deleting')}
        confirmLabel={t('shell.common.delete')}
        onConfirm={confirmDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </Stack>
  );
}
