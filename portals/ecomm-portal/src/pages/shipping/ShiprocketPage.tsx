import { Stack } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import { PageHeader } from '@duncit/ui';
import AccountStatusCard from './AccountStatusCard';
import PickupSyncCard from './PickupSyncCard';

/** The ShipRocket account behind every parcel: its health, and its pickup addresses against our warehouses. */
export default function ShiprocketPage() {
  const { t } = useTranslation();
  return (
    <Stack spacing={3}>
      <PageHeader title={t('ecommPortal.nav.shiprocket')} subtitle={t('ecommPortal.shipping.shiprocketSubtitle')} />
      <AccountStatusCard />
      <PickupSyncCard />
    </Stack>
  );
}
