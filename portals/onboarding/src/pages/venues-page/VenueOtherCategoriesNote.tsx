import { Alert } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import { venueCategoryPaths, type VenueCategoryCarrier } from '@duncit/utils';

/**
 * The Edit Venue dialog still edits ONE category — the venue's primary. A venue
 * may host in more, and the server reads a changed primary as "this venue is
 * now that one category", so the reviewer is told which other categories the
 * venue has, and what changing the primary does to them, before they save.
 * Nothing renders for a venue in one category (or none).
 */
export default function VenueOtherCategoriesNote({ venue }: Readonly<{ venue?: VenueCategoryCarrier | null }>) {
  const { t } = useTranslation();
  const others = venueCategoryPaths(venue).slice(1);
  if (others.length === 0) return null;
  return (
    <Alert severity="info" data-testid="venue-other-categories">
      {t('onboarding.venues.otherCategoriesNote', { vars: { categories: others.join(', ') } })}
    </Alert>
  );
}
