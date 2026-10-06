import { Box, Stack, TextField } from '@mui/material';
import ContentCopyRounded from '@mui/icons-material/ContentCopyRounded';
import OpenInNewRounded from '@mui/icons-material/OpenInNewRounded';
import PictureAsPdfRounded from '@mui/icons-material/PictureAsPdfRounded';
import QrCode2Rounded from '@mui/icons-material/QrCode2Rounded';
import { useTranslation } from '@duncit/app-settings';
import { DuncitButton } from '@duncit/buttons';
import type { PublicPageLink } from '@duncit/utils';

interface Props {
  link: PublicPageLink;
  title: string;
  posterLoading: boolean;
  onCopy: () => void;
  onDownloadQr: () => void;
  onDownloadPoster: () => void;
}

/** The QR is a print target first; this size keeps it scannable off a phone screen too. */
const QR_SIZE = 168;

/** The published link, its QR, and the three things an owner does with them. */
export function PublishedLinkPanel(props: Readonly<Props>) {
  const { link, title, posterLoading, onCopy, onDownloadQr, onDownloadPoster } = props;
  const { t } = useTranslation();

  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} data-testid="public-page-link-panel">
      <Box
        component="img"
        src={link.qr_data_url}
        alt={t('publicPage.link.qrAlt', { vars: { name: title } })}
        data-testid="public-page-qr"
        sx={{
          width: QR_SIZE,
          height: QR_SIZE,
          alignSelf: { xs: 'center', sm: 'flex-start' },
          border: 1,
          borderColor: 'divider',
          borderRadius: 1,
          bgcolor: 'common.white',
          p: 1,
        }}
      />
      <Stack spacing={1.5} sx={{ flex: 1, minWidth: 0 }}>
        <TextField
          label={t('publicPage.link.label')}
          value={link.url}
          size="small"
          fullWidth
          slotProps={{ htmlInput: { readOnly: true, 'data-testid': 'public-page-link' } }}
        />
        <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1 }}>
          <DuncitButton
            variant="contained"
            startIcon={<ContentCopyRounded />}
            onClick={onCopy}
            data-testid="public-page-copy-link"
          >
            {t('publicPage.link.copy')}
          </DuncitButton>
          <DuncitButton
            variant="outlined"
            startIcon={<OpenInNewRounded />}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="public-page-open-link"
          >
            {t('publicPage.link.open')}
          </DuncitButton>
          <DuncitButton
            variant="outlined"
            startIcon={<QrCode2Rounded />}
            onClick={onDownloadQr}
            data-testid="public-page-download-qr"
          >
            {t('publicPage.link.downloadQr')}
          </DuncitButton>
          <DuncitButton
            variant="outlined"
            startIcon={<PictureAsPdfRounded />}
            onClick={onDownloadPoster}
            loading={posterLoading}
            data-testid="public-page-download-poster"
          >
            {posterLoading ? t('publicPage.link.preparingPoster') : t('publicPage.link.downloadPoster')}
          </DuncitButton>
        </Stack>
      </Stack>
    </Stack>
  );
}
