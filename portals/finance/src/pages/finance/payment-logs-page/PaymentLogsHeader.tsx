import { Stack, Typography } from '@mui/material';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/app-settings';
import { logCopy } from './logCopy';
import type { PaymentShop } from './queries';

interface Props {
  shop?: PaymentShop;
  exporting: boolean;
  onExportPdf: () => void;
}

/** The page heading, the line saying what the page shows, and the Export PDF button. */
export default function PaymentLogsHeader({ shop, exporting, onExportPdf }: Readonly<Props>) {
  const { t } = useTranslation();
  const { title, subtitle } = logCopy(t, shop);

  return (
    <>
      <Stack
        direction="row"
        spacing={1.5}
        sx={{
          alignItems: 'center',
          mb: 1,
        }}
      >
        <ReceiptLongIcon color="primary" />
        <Typography component="h1" variant="h5" sx={{ fontWeight: 700, flex: 1 }}>
          {title}
        </Typography>
        <DuncitButton
          variant="outlined"
          size="small"
          startIcon={<PictureAsPdfIcon />}
          loading={exporting}
          onClick={onExportPdf}
          data-testid="finance-payments-export-pdf"
        >
          {t('finance.payment.exportPdf')}
        </DuncitButton>
      </Stack>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
        {subtitle}
      </Typography>
    </>
  );
}
