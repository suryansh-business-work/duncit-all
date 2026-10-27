import { useNavigate } from 'react-router';
import { useApolloClient } from '@apollo/client/react';
import { Stack } from '@mui/material';
import CardGiftcardIcon from '@mui/icons-material/CardGiftcard';
import { useApolloTableFetch } from '@duncit/table';
import { useDateFormat, useTranslation } from '@duncit/app-settings';
import TablePageHeader from '../../../components/TablePageHeader';
import { useCountedFetch } from '../../../lib/useCountedFetch';
import { useCurrencySymbol } from '../../../lib/useCurrencySymbol';
import GiftCardCardsTable from './GiftCardCardsTable';
import { GIFT_CARD_CARDS_TABLE, GIFT_CARD_CURRENCY, type GiftCardCardRow } from './queries';

/** Loyalty > Virtual Gift Cards > All Cards — every card ever sold, with its
 * buyer, its recipient, and (once converted to coins) its redeemer. A row opens
 * the card's own page when cardPath is given. */
export default function GiftCardCardsPage({ cardPath }: Readonly<{ cardPath?: (id: string) => string }>) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const client = useApolloClient();
  const { formatDateTime } = useDateFormat();
  const currencySymbol = useCurrencySymbol(GIFT_CARD_CURRENCY);
  const fetchTable = useApolloTableFetch<GiftCardCardRow>(client, GIFT_CARD_CARDS_TABLE, 'giftCardsTable');
  const { total, fetchRows } = useCountedFetch(fetchTable);

  return (
    <Stack spacing={2.5}>
      <TablePageHeader
        icon={<CardGiftcardIcon color="primary" />}
        title={t('finance.giftCards.cardsTitle')}
        total={total}
      />
      <GiftCardCardsTable
        fetchRows={fetchRows}
        currencySymbol={currencySymbol}
        formatDateTime={formatDateTime}
        onRowClick={cardPath ? (row) => navigate(cardPath(row.id)) : undefined}
      />
    </Stack>
  );
}
