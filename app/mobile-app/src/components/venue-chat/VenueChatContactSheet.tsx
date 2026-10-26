import { YStack } from 'tamagui';
import type { VenueChatHostCard, VenueChatVenueCard } from '@duncit/utils';

import { DuncitDialog } from '@/components/DuncitDialog';
import { useTranslation } from '@/hooks/useTranslation';
import { HostContactCard, VenueContactCard } from './VenueChatPartyCards';

interface Props {
  open: boolean;
  /** The pod's lead host; null when none is on record. */
  host: VenueChatHostCard | null | undefined;
  venue: VenueChatVenueCard | null | undefined;
  onClose: () => void;
  /** Opens the host's profile — the sheet closes first, the chat stays underneath. */
  onViewProfile: (userId: string) => void;
  /** Opens the venue's page. */
  onViewVenue: (venueId: string) => void;
}

/**
 * The venue chat's Contact sheet: both sides of the booking at once — the
 * host and the venue — each with their details, how to reach them (the phone
 * dials, the email opens the mail app) and a way to their profile or page.
 * A bottom sheet over the thread, so nothing typed is lost. mWeb twin:
 * VenueChatContactDialog.
 */
export function VenueChatContactSheet({
  open,
  host,
  venue,
  onClose,
  onViewProfile,
  onViewVenue,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const leave = (go: () => void) => {
    onClose();
    go();
  };

  return (
    <DuncitDialog
      open={open}
      onClose={onClose}
      testID="venue-chat-contact-sheet"
      title={t('availability.offers.chat.contactTitle')}
      closeLabel={t('availability.offers.chat.close')}
    >
      <YStack gap={12}>
        {host ? (
          <HostContactCard
            host={host}
            onViewProfile={(userId) => leave(() => onViewProfile(userId))}
          />
        ) : null}
        {venue ? (
          <VenueContactCard
            venue={venue}
            onViewVenue={(venueId) => leave(() => onViewVenue(venueId))}
          />
        ) : null}
      </YStack>
    </DuncitDialog>
  );
}
