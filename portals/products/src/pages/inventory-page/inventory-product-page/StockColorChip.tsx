import { Chip } from '@mui/material';
import { useTranslation } from '@duncit/shell';

interface StockColorChipProps {
  inventory: number;
  lowStockAlert: number;
}

export default function StockColorChip({ inventory, lowStockAlert }: Readonly<StockColorChipProps>) {
  const { t } = useTranslation();
  let color: 'success' | 'warning' | 'error' = 'success';
  let label = t('products.stock.inStock', { vars: { count: inventory } });
  if (inventory <= 0) {
    color = 'error';
    label = t('products.stock.outOfStock');
  } else if (inventory <= lowStockAlert) {
    color = 'warning';
    label = t('products.stock.lowStock', { vars: { count: inventory } });
  }
  return <Chip size="small" color={color} label={label} />;
}
