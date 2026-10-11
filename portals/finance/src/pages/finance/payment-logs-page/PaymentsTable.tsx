import { useMemo, type MutableRefObject } from 'react';
import { CircularProgress, Stack, Tooltip } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import UndoIcon from '@mui/icons-material/Undo';
import { DuncitIconButton } from '@duncit/buttons';
import { DuncitTable, type DuncitColumn, type TableFetch } from '@duncit/table';
import { useTranslation } from '@duncit/app-settings';
import { buildPaymentColumns } from './paymentColumns';
import type { PaymentRow, PaymentShop } from './queries';

const getPaymentRowId = (p: PaymentRow) => p.id;

/** Each log keeps its own saved column layout: the shops' tables differ from the all-payments one. */
const TABLE_ID: Record<PaymentShop, string> = {
  POD_SHOP: 'finance-pod-shop-payments',
  ECOMM: 'finance-ecomm-payments',
};

interface Props {
  /** One shop's log. Absent is the all-payments log, exactly as it always was. */
  shop?: PaymentShop;
  /** The page's own title, which names the table for a screen reader. */
  title: string;
  fetchRows: TableFetch<PaymentRow>;
  refetchRef: MutableRefObject<(() => void) | null>;
  downloadingId: string | null;
  onDownload: (p: PaymentRow) => void;
  onRefund: (p: PaymentRow) => void;
  /** Opens the payment's audit page. Row actions stop propagation so they never open it. */
  onOpen: (p: PaymentRow) => void;
}

export default function PaymentsTable({
  shop,
  title,
  fetchRows,
  refetchRef,
  downloadingId,
  onDownload,
  onRefund,
  onOpen,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const columns = useMemo<DuncitColumn<PaymentRow>[]>(() => {
    const renderActions = (p: PaymentRow) => {
      const downloadTitle = p.invoice_no ? t('finance.payment.downloadInvoice') : t('finance.payment.noInvoiceGenerated');
      const refundTitle = p.status === 'SUCCESS' ? t('finance.payment.refund') : t('finance.payment.refundOnlySuccess');
      return (
      <Stack direction="row" spacing={0.5} component="span">
        <Tooltip title={downloadTitle}>
          <span>
            {/* The Tooltip names the span, so the button needs its own name. */}
            <DuncitIconButton
              size="small"
              aria-label={downloadTitle}
              data-testid="finance-payments-download-invoice"
              disabled={!p.invoice_no || downloadingId === p.id}
              onClick={(event) => {
                // The row opens the detail page; downloading must not also navigate.
                event.stopPropagation();
                onDownload(p);
              }}
            >
              {downloadingId === p.id ? <CircularProgress size={16} /> : <DownloadIcon fontSize="small" />}
            </DuncitIconButton>
          </span>
        </Tooltip>
        <Tooltip title={refundTitle}>
          <span>
            <DuncitIconButton
              size="small"
              aria-label={refundTitle}
              data-testid="finance-payments-refund"
              color="warning"
              disabled={p.status !== 'SUCCESS'}
              onClick={(event) => {
                event.stopPropagation();
                onRefund(p);
              }}
            >
              <UndoIcon fontSize="small" />
            </DuncitIconButton>
          </span>
        </Tooltip>
      </Stack>
      );
    };
    return buildPaymentColumns({ t, renderActions, shop });
  }, [downloadingId, onDownload, onRefund, shop, t]);

  return (
    <DuncitTable<PaymentRow>
      tableId={shop ? TABLE_ID[shop] : 'finance-payments'}
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getPaymentRowId}
      onRowClick={onOpen}
      emptyText={t('finance.payment.logsEmpty')}
      defaultSort={{ field: 'created_at', dir: 'desc' }}
      searchPlaceholder={t('finance.payment.logsSearch')}
      refetchRef={refetchRef}
      ariaLabel={title}
    />
  );
}
