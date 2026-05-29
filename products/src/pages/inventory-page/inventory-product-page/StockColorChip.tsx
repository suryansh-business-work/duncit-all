import { Chip } from '@mui/material';

interface StockColorChipProps {
  inventory: number;
  lowStockAlert: number;
}

export default function StockColorChip({ inventory, lowStockAlert }: StockColorChipProps) {
  let color: 'success' | 'warning' | 'error' = 'success';
  let label = `${inventory} in stock`;
  if (inventory <= 0) {
    color = 'error';
    label = 'Out of stock';
  } else if (inventory <= lowStockAlert) {
    color = 'warning';
    label = `Low stock (${inventory})`;
  }
  return <Chip size="small" color={color} label={label} />;
}
