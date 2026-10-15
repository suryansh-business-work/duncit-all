import { useState } from 'react';
import { useApolloClient } from '@apollo/client/react';
import { Alert, Stack, Typography } from '@mui/material';
import QrCode2Icon from '@mui/icons-material/QrCode2';
import { useTranslation } from '@duncit/app-settings';
import { DuncitButton } from '@duncit/buttons';
import { downloadBase64File, parseApiError, publicPageTableStickersFileName } from '@duncit/utils';
import { VENUE_TABLE_STICKERS } from '../../documents';

interface Props {
  /** None before the venue's first save — there are no saved tables to print yet. */
  venueId?: string;
  venueName?: string;
  /** Tables are saved on the venue — the server prints the saved list, never the typed one. */
  hasSavedTables: boolean;
  idPrefix: string;
}

/**
 * Every table's QR sticker in one PDF (`myVenueTableStickersPdfBase64`) — the
 * owner's, or a Venues console editor's. Each QR opens the menu with its table
 * filled in at checkout. A failure is said on the page, never swallowed.
 */
export default function FoodTableStickersButton({ venueId, venueName, hasSavedTables, idPrefix }: Readonly<Props>) {
  const { t } = useTranslation();
  const client = useApolloClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ready = Boolean(venueId) && hasSavedTables;

  const download = async () => {
    if (!venueId) return;
    setLoading(true);
    setError(null);
    try {
      const { data } = await client.query({
        query: VENUE_TABLE_STICKERS,
        variables: {
          venueId,
          headline: t('venueFoodOwner.tables.stickerHeadline'),
          tableHeading: t('venueFoodOwner.tables.stickerTableWord'),
        },
        fetchPolicy: 'no-cache',
      });
      const pdf = data?.myVenueTableStickersPdfBase64;
      if (!pdf) {
        setError(t('venueFoodOwner.tables.downloadFailed'));
        return;
      }
      downloadBase64File(pdf, publicPageTableStickersFileName(venueName ?? ''), 'application/pdf');
    } catch (failure) {
      setError(parseApiError(failure, t('venueFoodOwner.tables.downloadFailed')));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Stack spacing={1}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
        <DuncitButton
          variant="outlined"
          startIcon={<QrCode2Icon />}
          disabled={!ready}
          loading={loading}
          onClick={download}
          data-testid={`${idPrefix}-food-table-stickers`}
        >
          {t('venueFoodOwner.tables.download')}
        </DuncitButton>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {ready ? t('venueFoodOwner.tables.downloadHint') : t('venueFoodOwner.tables.none')}
        </Typography>
      </Stack>
      {error && (
        <Alert severity="error" onClose={() => setError(null)} data-testid={`${idPrefix}-food-table-stickers-error`}>
          {error}
        </Alert>
      )}
    </Stack>
  );
}
