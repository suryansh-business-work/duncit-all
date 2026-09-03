import { useQuery } from '@apollo/client/react';
import { formatMoney } from '@duncit/utils';
import DetailLine from './DetailLine';
import { DetailsHeading, DetailsState } from './AutoPodEnrolledDialog';
import { AUTO_POD_VENUE_DETAILS, type AutoPodTableRow, type AutoPodVenueDetails } from '../queries';

interface Props {
  row: AutoPodTableRow;
  t: (key: string) => string;
  formatDateTime: (value: string) => string;
}

interface Data {
  venue: AutoPodVenueDetails | null;
}

/**
 * The venue behind a green Venue dot: who runs it, how to reach them, where it
 * is and what it holds — plus the slot it committed to this offer and what
 * that slot is priced at. The venue is read on open; the slot comes off the row.
 */
export default function VenueDetailsBody({ row, t, formatDateTime }: Readonly<Props>) {
  const claim = row.venue_claim;
  const { data, loading, error } = useQuery<Data>(AUTO_POD_VENUE_DETAILS, {
    variables: { venue_doc_id: claim?.venue_id ?? '' },
    skip: !claim,
  });
  const venue = data?.venue ?? null;
  const address = venue
    ? [venue.address_line1, venue.address_line2, venue.locality, venue.city, venue.state]
        .filter(Boolean)
        .join(', ')
    : '';
  const slotEnd = claim?.pod_end_date_time ? formatDateTime(claim.pod_end_date_time) : '';
  const slot = claim ? [formatDateTime(claim.pod_date_time), slotEnd].filter(Boolean).join(' – ') : '';

  return (
    <>
      <DetailsHeading name={claim?.venue_name ?? ''} />
      <DetailsState loading={loading} failed={error ? t('admin.autoPods.venueDetailsFailed') : null} />
      {venue ? (
        <>
          <DetailLine label={t('admin.autoPods.venueOwner')} value={venue.owner_name} />
          <DetailLine label={t('admin.autoPods.venueEmail')} value={venue.owner_email} />
          <DetailLine label={t('admin.autoPods.venuePhone')} value={venue.owner_phone} />
          <DetailLine label={t('admin.autoPods.venueAddress')} value={address} />
          <DetailLine
            label={t('admin.autoPods.venueCapacity')}
            value={venue.capacity > 0 ? String(venue.capacity) : ''}
          />
        </>
      ) : null}
      <DetailLine label={t('admin.autoPods.venueSlot')} value={slot} />
      <DetailLine
        label={t('admin.autoPods.venueSlotPrice')}
        value={claim ? formatMoney(claim.slot_price) : ''}
      />
      <DetailLine
        label={t('admin.autoPods.enrolledAt')}
        value={claim ? formatDateTime(claim.accepted_at) : ''}
      />
    </>
  );
}
