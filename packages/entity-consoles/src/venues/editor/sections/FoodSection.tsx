import RestaurantMenuIcon from '@mui/icons-material/RestaurantMenu';
import { useTranslation } from '@duncit/shell';
import { VenueFoodFields, type FoodAccountMode } from '@duncit/venue-food';
import type { Control } from 'react-hook-form';
import SectionCard from '../../detail/SectionCard';
import type { VenueRegistrationConfig } from '../queries';
import type { VenueFormValues } from '../types';
import { sectionAnchor } from './venue-editor-sections';

/** The Razorpay account guests pay is the owner's own, linked from the Partners portal — staff only see whether there is one. */
const OWNER_ACCOUNT: FoodAccountMode = { kind: 'status' };

/**
 * Food Menu — whether the venue serves food, its dishes and QR ordering (the
 * switch, the discount and the venue's GST): the shared food fields
 * (@duncit/venue-food), the same ones the owner's form, the record's Food Menu
 * tab and mWeb edit, on the shared rules. A save leaves the owner's account as
 * it is. The GST number itself sits in Venue Documents, beside its certificate.
 */
export default function FoodSection({
  control,
  config,
  venueId,
  venueName,
  hasSavedTables,
}: Readonly<{
  control: Control<VenueFormValues, unknown, VenueFormValues>;
  config: VenueRegistrationConfig;
  /** The venue being edited — dish photos are filed in its folder; '' while it is being created. */
  venueId: string;
  venueName?: string;
  /** The venue has tables saved — its QR stickers can be printed. */
  hasSavedTables?: boolean;
}>) {
  const { t } = useTranslation();

  return (
    <SectionCard
      id={sectionAnchor('food')}
      icon={<RestaurantMenuIcon color="primary" />}
      title={t('directory.venueEditor.sectionFood')}
    >
      <VenueFoodFields
        control={control}
        config={config}
        account={OWNER_ACCOUNT}
        upload={{ venueId: venueId || undefined, surface: 'PORTALS' }}
        idPrefix="venue-editor"
        venueName={venueName}
        hasSavedTables={hasSavedTables}
      />
    </SectionCard>
  );
}
