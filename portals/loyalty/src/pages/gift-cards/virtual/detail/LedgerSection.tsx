import { Chip, List, ListItem, ListItemText, Typography } from '@mui/material';
import { SectionCard } from '@duncit/ui';
import { formatMoney } from '@duncit/utils';
import { useDateFormat, useTranslation } from '@duncit/app-settings';
import type { GiftCardTxnRow } from '../queries';

interface Props {
  rows: GiftCardTxnRow[];
  currencySymbol: string;
}

/** The card's own insert-only ledger, newest first: its issue, and its redemption once it happens. */
export default function LedgerSection({ rows, currencySymbol }: Readonly<Props>) {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat();
  const money = (n: number) => formatMoney(n, { symbol: currencySymbol });

  return (
    <SectionCard title={t('loyalty.virtual.ledgerTitle')}>
      {rows.length === 0 ? (
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {t('loyalty.virtual.ledgerEmpty')}
        </Typography>
      ) : (
        <List dense disablePadding aria-label={t('loyalty.virtual.ledgerTitle')}>
          {rows.map((row) => {
            const issue = row.type === 'ISSUE';
            return (
              <ListItem key={row.id} divider disableGutters data-testid={`ledger-${row.id}`}>
                <Chip
                  size="small"
                  variant="outlined"
                  color={issue ? 'primary' : 'success'}
                  label={issue ? t('finance.giftCards.typeIssue') : t('finance.giftCards.typeRedeem')}
                  sx={{ mr: 1.5, fontWeight: 800 }}
                />
                <ListItemText
                  primary={`${money(row.amount)} · ${row.user_name || row.user_email}`}
                  secondary={`${formatDateTime(row.created_at)} · ${t('loyalty.virtual.balanceAfterRow', {
                    vars: { amount: money(row.balance_after) },
                  })}`}
                />
              </ListItem>
            );
          })}
        </List>
      )}
    </SectionCard>
  );
}
