import RestaurantMenuIcon from '@mui/icons-material/RestaurantMenu';
import { useTranslation } from '@duncit/shell';
import type { Control } from 'react-hook-form';
import SectionCard from '../../detail/SectionCard';
import OffersFoodField from '../fields/OffersFoodField';
import type { VenueRegistrationConfig } from '../queries';
import type { VenueFormValues } from '../types';
import { sectionAnchor } from './venue-editor-sections';

/**
 * Food Menu — whether the venue serves food, and its dishes. Its own section,
 * as on the owner's form.
 *
 * What is NOT here is deliberate: QR ordering — the Razorpay account, the
 * on/off switch and the discount — is the owner's own connection and is set
 * from the Partners portal. Staff edit the menu and nothing else.
 */
export default function FoodSection({
  control,
  config,
  onPick,
}: Readonly<{
  control: Control<VenueFormValues>;
  config: VenueRegistrationConfig;
  onPick: (folder?: string) => Promise<string | null>;
}>) {
  const { t } = useTranslation();

  return (
    <SectionCard
      id={sectionAnchor('food')}
      icon={<RestaurantMenuIcon color="primary" />}
      title={t('directory.venueEditor.sectionFood')}
    >
      <OffersFoodField control={control} config={config} onPick={() => onPick('/venues/menu')} />
    </SectionCard>
  );
}
