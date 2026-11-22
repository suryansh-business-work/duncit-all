import type { ReactNode } from 'react';
import { Link } from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { useTranslation } from '@duncit/app-settings';
import { rentalPodPath, type RentalBookingDetail } from '@duncit/utils';
import DetailSection, { type DetailField } from './DetailSection';
import { orNotProvided, telHref, when } from './format';
import type { RentalDetailLinks } from './types';

interface Props {
  detail: RentalBookingDetail;
  finance: boolean;
  links: RentalDetailLinks;
}

/** A link to another site, opened in a new tab with an icon that says so. */
function OutboundLink({ href, children, testId }: Readonly<{ href: string; children: ReactNode; testId: string }>) {
  return (
    <Link
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      underline="hover"
      variant="body2"
      data-testid={testId}
      sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, fontWeight: 600 }}
    >
      {children}
      <OpenInNewIcon fontSize="inherit" aria-hidden />
    </Link>
  );
}

function PhoneValue({ phone }: Readonly<{ phone: string | null }>) {
  const { t } = useTranslation();
  if (!phone) return <>{t('venueRentals.detail.notProvided')}</>;
  return (
    <Link href={telHref(phone)} underline="hover">
      {phone}
    </Link>
  );
}

/** Who rented it. The email and the profile link are Finance's: the venue arranges the return by phone. */
export function RentalGuestSection({ detail, finance, links }: Readonly<Props>) {
  const { t } = useTranslation();
  const { guest } = detail;
  const fields: DetailField[] = [
    { key: 'name', label: t('venueRentals.detail.name'), value: orNotProvided(t, guest.name) },
    { key: 'phone', label: t('venueRentals.detail.phone'), value: <PhoneValue phone={guest.phone} /> },
  ];
  if (finance) fields.push({ key: 'email', label: t('venueRentals.detail.email'), value: orNotProvided(t, guest.email) });
  const profile =
    finance && guest.id && links.profileUrl ? (
      <OutboundLink href={links.profileUrl(guest.id)} testId="rental-detail-guest-profile">
        {t('venueRentals.detail.viewProfile')}
      </OutboundLink>
    ) : null;
  return <DetailSection title={t('venueRentals.detail.guest')} testId="rental-detail-guest" action={profile} fields={fields} />;
}

/** The pod the item was rented for, with a link to its page on mWeb when the console knows where that is. */
export function RentalPodSection({ detail, links }: Readonly<Omit<Props, 'finance'>>) {
  const { t } = useTranslation();
  const { pod, booking } = detail;
  const path = rentalPodPath(pod);
  const fields: DetailField[] = [
    { key: 'title', label: t('venueRentals.detail.name'), value: pod?.title ?? booking.pod_title },
    { key: 'starts', label: t('venueRentals.detail.starts'), value: when(pod?.starts_at) },
    { key: 'ends', label: t('venueRentals.detail.ends'), value: when(pod?.ends_at) },
  ];
  const open =
    path && links.mwebUrl !== undefined ? (
      <OutboundLink href={`${links.mwebUrl}${path}`} testId="rental-detail-open-pod">
        {t('venueRentals.detail.openPod')}
      </OutboundLink>
    ) : null;
  return <DetailSection title={t('venueRentals.detail.pod')} testId="rental-detail-pod" action={open} fields={fields} />;
}

/** Where the item goes back to. The venue's email is Finance's, like the guest's. */
export function RentalVenueSection({ detail, finance }: Readonly<Omit<Props, 'links'>>) {
  const { t } = useTranslation();
  const { venue } = detail;
  const fields: DetailField[] = [
    { key: 'name', label: t('venueRentals.detail.name'), value: orNotProvided(t, venue.name) },
    { key: 'contact', label: t('venueRentals.detail.contact'), value: orNotProvided(t, venue.contact_name) },
    { key: 'phone', label: t('venueRentals.detail.phone'), value: <PhoneValue phone={venue.phone} /> },
  ];
  if (finance) fields.push({ key: 'email', label: t('venueRentals.detail.email'), value: orNotProvided(t, venue.email) });
  fields.push({ key: 'address', label: t('venueRentals.detail.address'), value: orNotProvided(t, venue.address) });
  return <DetailSection title={t('venueRentals.detail.venue')} testId="rental-detail-venue" fields={fields} />;
}
