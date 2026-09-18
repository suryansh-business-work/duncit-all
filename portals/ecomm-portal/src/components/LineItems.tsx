import { List, ListItem, Stack, Typography } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import { money } from '../lib/format';
import ProductThumb from './ProductThumb';

/** One bought (or returned) line. */
export interface LineItem {
  key: string;
  name: string;
  /** Variant and SKU, already worded. */
  details: readonly string[];
  imageUrl: string;
  qty: number;
  unitPrice: number;
}

interface LineItemsProps {
  lines: readonly LineItem[];
  ariaLabel: string;
  symbol?: string;
}

/** Lines of an order or a return: picture, name, variant, then "qty × price" and the line's total. */
export default function LineItems({ lines, ariaLabel, symbol }: Readonly<LineItemsProps>) {
  const { t } = useTranslation();
  return (
    <List disablePadding aria-label={ariaLabel}>
      {lines.map((line) => (
        <ListItem key={line.key} divider disableGutters sx={{ gap: 1.5, alignItems: 'flex-start' }}>
          <ProductThumb src={line.imageUrl} size={48} />
          <Stack sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {line.name}
            </Typography>
            {line.details.filter(Boolean).map((detail) => (
              <Typography key={detail} variant="caption" sx={{ color: 'text.secondary' }}>
                {detail}
              </Typography>
            ))}
          </Stack>
          <Stack sx={{ alignItems: 'flex-end', flexShrink: 0 }}>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {t('ecommPortal.orders.qtyAt', { vars: { qty: line.qty, price: money(line.unitPrice, symbol) } })}
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              {money(line.qty * line.unitPrice, symbol)}
            </Typography>
          </Stack>
        </ListItem>
      ))}
    </List>
  );
}
