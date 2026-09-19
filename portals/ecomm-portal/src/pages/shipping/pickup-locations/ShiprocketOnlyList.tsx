import { Divider, Stack, Typography } from '@mui/material';
import AddBusinessIcon from '@mui/icons-material/AddBusiness';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import { StatusChip, type StatusColorMap } from '@duncit/ui';
import type { ShiprocketOnlyPickup } from '../queries';

const VERIFIED_COLORS: StatusColorMap = { VERIFIED: 'success', UNVERIFIED: 'warning' };

interface ShiprocketOnlyListProps {
  pickups: readonly ShiprocketOnlyPickup[];
  busy: boolean;
  onImport: (nickname: string) => Promise<boolean>;
}

/** A pickup address from the account, with the button that makes a warehouse of it. */
function PickupLine({ pickup, busy, onImport }: Readonly<{ pickup: ShiprocketOnlyPickup } & Omit<ShiprocketOnlyListProps, 'pickups'>>) {
  const { t } = useTranslation();
  const nameId = `shiprocket-pickup-${pickup.nickname.replaceAll(/\W/g, '-')}`;
  const verified = pickup.verified ? 'VERIFIED' : 'UNVERIFIED';
  return (
    <Stack direction="row" spacing={1.5} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap', py: 1 }}>
      <Stack sx={{ minWidth: 200, flex: 1 }}>
        <Typography id={nameId} variant="body2" sx={{ fontWeight: 700 }}>
          {pickup.nickname}
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {[pickup.city, pickup.pincode].filter(Boolean).join(' · ')}
        </Typography>
      </Stack>
      <StatusChip
        status={verified}
        label={pickup.verified ? t('ecommPortal.shipping.verified') : t('ecommPortal.shipping.pickupAwaiting')}
        colorMap={VERIFIED_COLORS}
      />
      <DuncitButton size="small" variant="outlined" startIcon={<AddBusinessIcon />} disabled={busy} aria-describedby={nameId} onClick={() => onImport(pickup.nickname)}>
        {t('ecommPortal.shipping.importPickup')}
      </DuncitButton>
    </Stack>
  );
}

/**
 * Pickup addresses the ShipRocket account already has but no warehouse uses —
 * the one-click way to a ready warehouse, since ShipRocket verified them itself.
 */
export default function ShiprocketOnlyList({ pickups, busy, onImport }: Readonly<ShiprocketOnlyListProps>) {
  const { t } = useTranslation();
  if (pickups.length === 0) return null;
  return (
    <Stack component="section" aria-labelledby="shiprocket-only-title" spacing={0.5}>
      <Typography id="shiprocket-only-title" component="h3" variant="subtitle2">
        {t('ecommPortal.shipping.shiprocketOnlyTitle')}
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {t('ecommPortal.shipping.shiprocketOnlyHint')}
      </Typography>
      <Stack divider={<Divider flexItem />}>
        {pickups.map((pickup) => (
          <PickupLine key={pickup.nickname} pickup={pickup} busy={busy} onImport={onImport} />
        ))}
      </Stack>
    </Stack>
  );
}
