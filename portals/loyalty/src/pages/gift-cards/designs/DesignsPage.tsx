import { Link as RouterLink, useNavigate } from 'react-router';
import { Alert, Stack } from '@mui/material';
import ImageIcon from '@mui/icons-material/Image';
import AddIcon from '@mui/icons-material/Add';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/app-settings';
import TablePageHeader from '../../../components/TablePageHeader';
import { useTableRows } from '../../../lib/useTableRows';
import { useCanWrite } from '../../../lib/roles';
import DesignsTable from './DesignsTable';
import { GIFT_CARD_DESIGNS_TABLE, type GiftCardDesignRow } from './queries';

export const designPath = (id: string) => `/gift-cards/designs/${id}`;
export const NEW_DESIGN_PATH = '/gift-cards/designs/new';

/**
 * Loyalty > Gift Card Designs — the catalogue. Members only ever see the
 * default design; the rest wait here for a seasonal swap.
 */
export default function DesignsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const canWrite = useCanWrite();
  const { total, fetchRows } = useTableRows<GiftCardDesignRow>(GIFT_CARD_DESIGNS_TABLE, 'giftCardDesignsTable');
  return (
    <Stack spacing={2.5}>
      <TablePageHeader
        icon={<ImageIcon color="primary" />}
        title={t('loyalty.designs.title')}
        total={total}
        actions={
          canWrite ? (
            <DuncitButton component={RouterLink} to={NEW_DESIGN_PATH} variant="contained" startIcon={<AddIcon />}>
              {t('loyalty.designs.addCta')}
            </DuncitButton>
          ) : undefined
        }
      />
      <Alert severity="info">{t('loyalty.designs.defaultExplainer')}</Alert>
      <DesignsTable fetchRows={fetchRows} onRowClick={(row) => navigate(designPath(row.id))} />
    </Stack>
  );
}
