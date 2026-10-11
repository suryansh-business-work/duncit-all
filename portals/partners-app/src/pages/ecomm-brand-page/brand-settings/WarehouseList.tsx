import { Stack, Typography } from '@mui/material';
import WarehouseIcon from '@mui/icons-material/Warehouse';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import type { BrandWarehouse } from './warehouse.queries';
import WarehouseCard, { type WarehouseCardProps } from './WarehouseCard';

interface Props extends Omit<WarehouseCardProps, 'warehouse'> {
  warehouses: BrandWarehouse[];
  onAdd: () => void;
}

/** The brand's pickup addresses as cards, with the way to add another. */
export default function WarehouseList({ warehouses, onAdd, ...card }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Stack spacing={1.5}>
      {warehouses.length === 0 && (
        <Stack spacing={1} sx={{ alignItems: 'center', py: 3 }}>
          <WarehouseIcon color="disabled" sx={{ fontSize: 40 }} aria-hidden />
          <Typography sx={{ color: 'text.secondary' }}>{t('partners.warehouses.empty')}</Typography>
        </Stack>
      )}
      {warehouses.map((warehouse) => (
        <WarehouseCard key={warehouse.id} warehouse={warehouse} {...card} />
      ))}
      <DuncitButton variant="contained" onClick={onAdd} sx={{ alignSelf: 'flex-start' }}>
        {t('partners.warehouses.add')}
      </DuncitButton>
    </Stack>
  );
}
