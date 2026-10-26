import { Stack } from '@mui/material';
import HandshakeOutlinedIcon from '@mui/icons-material/HandshakeOutlined';
import { InfoRow } from '@duncit/ui';
import { formatMoney, venueMinBusinessLines } from '@duncit/utils';
import { useTranslation } from '@duncit/shell';
import SectionCard from './SectionCard';
import type { VenueOfferSettings } from './queries';

type Translate = ReturnType<typeof useTranslation>['t'];

interface Props {
  /** What the venue saved (0 = Duncit's default); absent on an older record. */
  own: VenueOfferSettings | null | undefined;
  /** What is in effect (`Venue.offer_*`): the venue's own value, or Duncit's default where it set 0. */
  effective: VenueOfferSettings;
}

/** "8 guests" — and "· Duncit's default" when the venue left it to the platform. */
const valueLine = (value: string, ownValue: number | undefined, t: Translate) =>
  ownValue ? value : `${value} · ${t('venueSettings.offers.usingDefault')}`;

/**
 * The venue's booking-offer terms, read back for staff: the fewest guests a
 * host's offer may be for and the hours either side has to answer, each as it
 * is in effect, saying when that is Duncit's default rather than the venue's own —
 * and the business the venue hopes each booking brings (a guide hosts see).
 */
export default function VenueOffersCard({ own, effective }: Readonly<Props>) {
  const { t } = useTranslation();
  const business = venueMinBusinessLines(own?.min_business, t, (rupees) => formatMoney(rupees, { decimals: Number.isInteger(rupees) ? 0 : 2 }));
  return (
    <SectionCard icon={<HandshakeOutlinedIcon color="primary" />} title={t('venueSettings.offers.title')}>
      <Stack spacing={1.5} data-testid="venue-offers-card">
        <InfoRow
          label={t('venueSettings.offers.minGuests')}
          value={valueLine(
            t('venueSettings.offers.guestsValue', { vars: { count: effective.min_guests } }),
            own?.min_guests,
            t,
          )}
        />
        <InfoRow
          label={t('venueSettings.offers.responseHours')}
          value={valueLine(
            t('venueSettings.offers.hoursValue', { vars: { count: effective.response_hours } }),
            own?.response_hours,
            t,
          )}
        />
        <InfoRow
          label={t('availability.offers.minBusiness.title')}
          value={business.length > 0 ? business.join(' · ') : t('availability.offers.minBusiness.notSet')}
        />
      </Stack>
    </SectionCard>
  );
}
