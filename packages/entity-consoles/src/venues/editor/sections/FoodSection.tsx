import RestaurantMenuIcon from '@mui/icons-material/RestaurantMenu';
import { useTranslation } from '@duncit/shell';
import type { Control } from 'react-hook-form';
import SectionCard from '../../detail/SectionCard';
import OffersFoodField from '../fields/OffersFoodField';
import type { VenueRegistrationConfig } from '../queries';
import type { VenueFormValues } from '../types';
import { sectionAnchor } from './venue-editor-sections';

/**
 * Food Menu — whether the venue serves food, its dishes and QR ordering (the
 * switch, the discount and the venue's GST). Its own section, as on the
 * owner's form. What is NOT here is deliberate: the Razorpay account guests pay
 * is the owner's own connection, linked from the Partners portal — staff see
 * whether there is one and a save leaves it as it is.
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
