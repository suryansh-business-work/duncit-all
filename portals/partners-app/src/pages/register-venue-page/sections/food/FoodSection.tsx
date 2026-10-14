import { useMemo } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { Alert, AlertTitle, Stack } from '@mui/material';
import RestaurantMenuIcon from '@mui/icons-material/RestaurantMenu';
import { useTranslation } from '@duncit/shell';
import { VenueFoodFields } from '@duncit/venue-food';
import type { RegisterVenueMode, RegisterVenueValues, VenueRegistrationConfig } from '../../register-venue';
import { partnersFoodAccount } from './AddRazorpayAccount';
import FoodGstinField from './FoodGstinField';

interface Props {
  form: UseFormReturn<RegisterVenueValues>;
  config: VenueRegistrationConfig;
  mode: RegisterVenueMode;
  /** The venue being registered — its photos are filed in its folder; none before the first save. */
  venueId?: string;
  /** The venue's saved GST number; '' when it has none. */
  savedGstin: string;
}

const ID_PREFIX = 'register-venue';

/**
 * The Food Menu registration section: the shared food fields (@duncit/venue-food
 * — the same dishes, ordering and GST the Food Menu page, the Venues console and
 * mWeb edit), with the owner picking the Razorpay account guests pay. Stays
 * editable after approval. Switching food off keeps the menu for later; the
 * server stops taking orders.
 */
export default function FoodSection({ form, config, mode, venueId, savedGstin }: Readonly<Props>) {
  const { t } = useTranslation();
  const account = useMemo(() => partnersFoodAccount(ID_PREFIX), []);

  return (
    <Stack spacing={2.5} data-testid="register-venue-food">
      <Alert severity="info" icon={<RestaurantMenuIcon />}>
        <AlertTitle component="h2" sx={{ fontWeight: 800 }}>
          {t('partners.registerVenuePage.foodSection')}
        </AlertTitle>
        {t('partners.registerVenuePage.foodSectionIntro')}
      </Alert>
      <VenueFoodFields
        control={form.control}
        config={config}
        account={account}
        upload={{ venueId, surface: 'PORTALS' }}
        idPrefix={ID_PREFIX}
        gstin={<FoodGstinField control={form.control} mode={mode} savedGstin={savedGstin} />}
      />
    </Stack>
  );
}
