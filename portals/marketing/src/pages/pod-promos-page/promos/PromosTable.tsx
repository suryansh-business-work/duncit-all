import { useMemo, useState, type RefObject } from 'react';
import { useApolloClient } from '@apollo/client/react';
import ImageSearchIcon from '@mui/icons-material/ImageSearch';
import { DuncitButton } from '@duncit/buttons';
import { DuncitTable, useApolloTableFetch } from '@duncit/table';
import { SectionCard } from '@duncit/ui';
import { useTranslation } from '@duncit/app-settings';
import { POD_PROMOS_TABLE, type PodPromo } from '../queries';
import PreviewDialog from '../preview/PreviewDialog';
import { getPromoColumns } from './promoColumns';
import PromoDrawer from './PromoDrawer';

const getRowId = (row: PodPromo) => row.id;

interface Props {
  canManage: boolean;
  /** Filled with the table's re-read, so the page can refresh it after scheduling from the header. */
  refetchRef: RefObject<(() => void) | null>;
}

/** Every promotion, soonest pod first, with the drawer for one and the preview dialog. */
export default function PromosTable({ canManage, refetchRef }: Readonly<Props>) {
  const { t, locale } = useTranslation();
  const client = useApolloClient();
  const [openId, setOpenId] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const fetchRows = useApolloTableFetch<PodPromo>(client, POD_PROMOS_TABLE, 'podPromosTable');
  const columns = useMemo(() => getPromoColumns(t, locale), [t, locale]);
  const refresh = () => refetchRef.current?.();

  return (
    <SectionCard title={t('marketing.podPromo.tableTitle')} subtitle={t('marketing.podPromo.tableSubtitle')}>
      <div data-tour="pod-promo-table">
        <DuncitTable<PodPromo>
          ariaLabel={t('marketing.podPromo.tableTitle')}
          tableId="marketing-pod-promos"
          columns={columns}
          fetchRows={fetchRows}
          getRowId={getRowId}
          onRowClick={(row) => setOpenId(row.id)}
          refetchRef={refetchRef}
          emptyText={t('marketing.podPromo.empty')}
          searchPlaceholder={t('marketing.podPromo.search')}
          defaultSort={{ field: 'pod_start', dir: 'asc' }}
          toolbarActions={
            <DuncitButton variant="outlined" startIcon={<ImageSearchIcon />} onClick={() => setPreviewing(true)} data-tour="pod-promo-preview" data-testid="pod-promo-open-preview">
              {t('marketing.podPromo.previewForPod')}
            </DuncitButton>
          }
        />
      </div>
      <PromoDrawer id={openId} canManage={canManage} onClose={() => setOpenId(null)} onChanged={refresh} />
      <PreviewDialog open={previewing} canManage={canManage} onClose={() => setPreviewing(false)} onPromoted={refresh} />
    </SectionCard>
  );
}
