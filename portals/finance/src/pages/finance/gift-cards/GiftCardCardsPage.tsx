import { useCallback, useRef, useState } from 'react';
import { useApolloClient, useQuery } from '@apollo/client/react';
import { Chip, Stack, Typography } from '@mui/material';
import CardGiftcardIcon from '@mui/icons-material/CardGiftcard';
import { useApolloTableFetch, type TableQueryState } from '@duncit/table';
import { useDateFormat, useTranslation } from '@duncit/app-settings';
import GiftCardCardsTable from './GiftCardCardsTable';
import { GIFT_CARD_CARDS_TABLE, GIFT_CARD_CURRENCY, type GiftCardCardRow } from './queries';

/** Finance > Gift Cards > Cards — every card ever sold, with its buyer, its
 * recipient, and (once converted to coins) its redeemer. */
export default function GiftCardCardsPage() {
  const { t } = useTranslation();
  const client = useApolloClient();
  const [total, setTotal] = useState<number | null>(null);
  const { formatDateTime } = useDateFormat();

  // Card amounts are rupees; the symbol is admin-configured rather than assumed.
  const { data: currencyData } = useQuery<any>(GIFT_CARD_CURRENCY, { fetchPolicy: 'cache-first' });
  const currencySymbol = currencyData?.publicFinanceSettings?.currency_symbol ?? '₹';

  const fetchTable = useApolloTableFetch<GiftCardCardRow>(
    client,
    GIFT_CARD_CARDS_TABLE,
    'giftCardsTable',
  );

  // The table drops out-of-order responses; this counter keeps the header count
  // on the same footing, so a slow earlier search cannot overwrite it.
  const seqRef = useRef(0);
  const fetchRows = useCallback(
    async (query: TableQueryState) => {
      seqRef.current += 1;
      const seq = seqRef.current;
      const page = await fetchTable(query);
      if (seq === seqRef.current) setTotal(page.total);
      return page;
    },
    [fetchTable],
  );

  return (
    <Stack spacing={2.5}>
      <Stack direction="row" spacing={1} sx={{
        alignItems: "center"
      }}>
        <CardGiftcardIcon color="primary" />
        <Typography variant="h5" sx={{ fontWeight: 900 }}>
          {t('finance.giftCards.cardsTitle')}
        </Typography>
        {total != null && <Chip size="small" label={total} sx={{ ml: 1 }} />}
      </Stack>

      <GiftCardCardsTable
        fetchRows={fetchRows}
        currencySymbol={currencySymbol}
        formatDateTime={formatDateTime}
      />
    </Stack>
  );
}
