import { Box, Divider, Drawer, Stack, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { DuncitIconButton } from '@duncit/buttons';
import { StatusChip } from '@duncit/ui';
import { formatMoney } from '@duncit/utils';
import { useTranslation } from '@duncit/shell';
import ReturnActions from './ReturnActions';
import { RETURN_STATUS_COLORS, returnStatusLabel } from './return-labels';
import { ReturnItems, ReturnPickup, ReturnReason, ReturnRefund, ReturnTimeline } from './ReturnDetailSections';
import type { ReturnRow } from './returns.queries';

interface Props {
  row: ReturnRow | null;
  onClose: () => void;
  onUpdated: (row: ReturnRow) => void;
}

const TITLE_ID = 'return-detail-title';

/** One return in full: what came back, why, the pickup, the refund and its history — with the next step. */
export default function ReturnDetailDrawer({ row, onClose, onUpdated }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Drawer
      anchor="right"
      open={Boolean(row)}
      onClose={onClose}
      slotProps={{ paper: { sx: { width: { xs: '100%', sm: 480 } }, role: 'dialog', 'aria-labelledby': TITLE_ID } }}
    >
      {row && (
        <Stack spacing={2.25} sx={{ p: 2.5 }} data-testid="return-detail">
          <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography id={TITLE_ID} variant="h6" component="h2" sx={{ fontWeight: 900 }}>
                {t('partners.returns.detailTitle', { vars: { no: row.return_no } })}
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {t('partners.returns.detailSubtitle', {
                  vars: { order: row.order_no, buyer: row.buyer_name, amount: formatMoney(row.gross, { decimals: 2 }) },
                })}
              </Typography>
            </Box>
            <DuncitIconButton aria-label={t('shell.common.close')} onClick={onClose}>
              <CloseIcon />
            </DuncitIconButton>
          </Stack>
          <Box>
            <StatusChip status={row.status} colorMap={RETURN_STATUS_COLORS} label={returnStatusLabel(t, row.status)} />
          </Box>
          <ReturnActions row={row} onUpdated={onUpdated} />
          <Divider />
          <ReturnItems row={row} />
          <ReturnReason row={row} />
          <ReturnPickup row={row} />
          <ReturnRefund row={row} />
          <ReturnTimeline row={row} />
        </Stack>
      )}
    </Drawer>
  );
}
