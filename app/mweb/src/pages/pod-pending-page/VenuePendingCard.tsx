import type { ReactElement } from 'react';
import { Card, Chip, Stack, Typography } from '@mui/material';
import CancelIcon from '@mui/icons-material/Cancel';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import EmailIcon from '@mui/icons-material/Email';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import MapIcon from '@mui/icons-material/Map';
import PersonIcon from '@mui/icons-material/Person';
import PhoneIcon from '@mui/icons-material/Phone';
import PlaceIcon from '@mui/icons-material/Place';
import ScheduleIcon from '@mui/icons-material/Schedule';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '../../i18n/useTranslation';
import InfoRow, { type InfoRowProps } from './InfoRow';
import { approvalBadge, type ApprovalIcon, venueMapUrl } from './podPending';
import type { PodPendingVenue } from './queries';

const ICON = { fontSize: 18 } as const;

const BADGE_ICONS: Record<ApprovalIcon, ReactElement> = {
  schedule: <ScheduleIcon sx={ICON} />,
  'check-circle': <CheckCircleIcon sx={ICON} />,
  cancel: <CancelIcon sx={ICON} />,
};

interface Props {
  venue: PodPendingVenue;
  status: string;
}

/** Venue details card — slot-decision badge, the venue's contact details and a
 * "View on Map" deep link. Native twin (rule 27). */
export default function VenuePendingCard({ venue, status }: Readonly<Props>) {
  const { t } = useTranslation();
  const badge = approvalBadge(status, t);
  const mapUrl = venueMapUrl(venue);

  const rows: InfoRowProps[] = [];
  if (venue.contact_person) {
    rows.push({
      icon: <PersonIcon sx={ICON} />,
      label: t('mweb.podPending.contactPerson'),
      value: venue.contact_person,
      testId: 'venue-pending-contact',
    });
  }
  if (venue.phone) {
    rows.push({
      icon: <PhoneIcon sx={ICON} />,
      label: t('mweb.podPending.phone'),
      value: venue.phone,
      testId: 'venue-pending-phone',
    });
  }
  if (venue.email) {
    rows.push({
      icon: <EmailIcon sx={ICON} />,
      label: t('mweb.podPending.email'),
      value: venue.email,
      testId: 'venue-pending-email',
    });
  }
  if (venue.address) {
    rows.push({
      icon: <PlaceIcon sx={ICON} />,
      label: t('mweb.podPending.address'),
      value: venue.address,
      testId: 'venue-pending-address',
    });
  }
  rows.push({
    icon: <FactCheckIcon sx={ICON} />,
    label: t('mweb.podPending.approvalStatus'),
    value: badge.label,
    testId: 'venue-pending-approval',
  });

  return (
    <Card variant="outlined" sx={{ p: 1.5, borderRadius: '16px' }} data-testid="venue-pending-card">
      <Stack spacing={1.25}>
        <Stack
          direction="row"
          spacing={1}
          sx={{
            alignItems: "center",
            justifyContent: "space-between"
          }}>
          <Typography
            variant="subtitle1"
            sx={{
              fontWeight: 700,
              minWidth: 0
            }}>
            {venue.venue_name}
          </Typography>
          <Chip
            size="small"
            variant="outlined"
            color={badge.tone}
            icon={BADGE_ICONS[badge.icon]}
            label={badge.label}
            data-testid="venue-pending-badge"
            sx={{ fontWeight: 700 }}
          />
        </Stack>
        {rows.map((row) => (
          <InfoRow key={row.label} {...row} />
        ))}
        {mapUrl && (
          <DuncitButton
            href={mapUrl}
            target="_blank"
            rel="noopener"
            size="small"
            startIcon={<MapIcon />}
            data-testid="venue-pending-map"
            sx={{ alignSelf: 'flex-start', fontWeight: 600 }}
          >
            {t('mweb.podPending.actionViewOnMap')}
          </DuncitButton>
        )}
      </Stack>
    </Card>
  );
}
