import { useMemo, useState } from 'react';
import { Box, Stack } from '@mui/material';
import PlaceIcon from '@mui/icons-material/Place';
import PersonIcon from '@mui/icons-material/Person';
import InfoIcon from '@mui/icons-material/Info';
import StarIcon from '@mui/icons-material/Star';
import CardGiftcardIcon from '@mui/icons-material/CardGiftcard';
import PaymentIcon from '@mui/icons-material/Payment';
import PaymentsIcon from '@mui/icons-material/Payments';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import GroupsIcon from '@mui/icons-material/Groups';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import { DuncitButton } from '@duncit/buttons';
import PodAccordion from '../../components/pod-details/PodAccordion';
import PodClubSection from '../../components/pod-details/PodClubSection';
import PodAboutSection from '../../components/pod-details/PodAboutSection';
import PodChipList from '../../components/pod-details/PodChipList';
import PodAttendeesSection from '../../components/pod-details/PodAttendeesSection';
import PodClubAdminsSection from '../../components/pod-details/PodClubAdminsSection';
import { isPodExpired } from '../../utils/podStatus';
import PodHostsSection from '../../components/pod-details/PodHostsSection';
import PodPlaceChargesSection from '../../components/pod-details/PodPlaceChargesSection';
import PodPaymentDetailsSection from '../../components/pod-details/PodPaymentDetailsSection';
import PodTicketDiscountSection from '../../components/pod-details/PodTicketDiscountSection';
import { useTranslation } from '../../i18n/useTranslation';

/** Expand all / Collapse all read as quiet text links above the stack. */
const linkSx = { minHeight: 36, px: 0.5, fontSize: 13, '&:hover': { bgcolor: 'transparent' } };

interface Props {
  pod: any;
  club: any;
  hosts: any[];
  attendees: any[];
  spotFills?: any[];
  /** Seats per attendee id, from podAttendeeSeats. */
  seatsByUser?: Record<string, number>;
  isFree: boolean;
  priceCompute: any;
  categoryCrumbs: readonly string[];
}

export default function PodDetailAccordions({
  pod,
  club,
  hosts,
  attendees,
  spotFills = [],
  seatsByUser,
  isFree,
  priceCompute,
  categoryCrumbs,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const offers: string[] = pod.what_this_pod_offers ?? [];
  const perks: string[] = pod.available_perks ?? [];
  const charges = pod.place_charges ?? [];
  const clubAdmins = pod.club?.club_admins ?? [];
  const paymentTerms = pod.payment_terms?.trim();
  // The offer only means something on a priced ticket that has tiers to show.
  const unitPrice = Number(pod.pod_amount) || 0;
  const hasTicketDiscount =
    !isFree && unitPrice > 0 && !!pod.ticket_discount_enabled && (pod.ticket_discount_tiers ?? []).length > 0;

  const sections = useMemo(
    () =>
      [
        { id: 'about', title: t('mweb.podDetails.sectionAbout'), icon: <InfoIcon fontSize="small" />, render: () => <PodAboutSection description={pod.pod_description} info={pod.pod_info} /> },
        { id: 'club', title: t('mweb.podDetails.sectionClub'), icon: <PlaceIcon fontSize="small" />, render: () => <PodClubSection club={club} categoryCrumbs={categoryCrumbs} /> },
        { id: 'clubAdmins', title: t('mweb.podDetails.sectionClubAdmins'), icon: <AdminPanelSettingsIcon fontSize="small" />, render: () => <PodClubAdminsSection admins={clubAdmins} /> },
        { id: 'offers', title: t('mweb.podDetails.sectionOffers'), icon: <StarIcon fontSize="small" />, render: () => <PodChipList items={offers} emptyText={t('mweb.podDetails.offersEmpty')} color="primary" /> },
        { id: 'hosts', title: t('mweb.podDetails.sectionHosts'), icon: <PersonIcon fontSize="small" />, render: () => <PodHostsSection hosts={hosts} /> },
        { id: 'attendees', title: t('mweb.podDetails.sectionAttendees'), icon: <GroupsIcon fontSize="small" />, render: () => <PodAttendeesSection attendees={attendees} attendeeIds={pod.pod_attendees ?? []} hostIds={pod.pod_hosts_id ?? []} totalSpots={pod.no_of_spots ?? 0} expired={isPodExpired(pod.pod_date_time)} spotFills={spotFills} seatsByUser={seatsByUser} seatsTaken={pod.seats_taken ?? undefined} /> },
        { id: 'perks', title: t('mweb.podDetails.sectionPerks'), icon: <CardGiftcardIcon fontSize="small" />, render: () => <PodChipList items={perks} emptyText={t('mweb.podDetails.perksEmpty')} color="success" /> },
        { id: 'payment', title: t('mweb.podDetails.sectionPayment'), icon: <PaymentsIcon fontSize="small" />, render: () => <PodPaymentDetailsSection amount={Number(pod.pod_amount) || 0} isFree={isFree} priceCompute={priceCompute} /> },
        ...(paymentTerms ? [{ id: 'terms', title: t('mweb.podDetails.sectionTerms'), icon: <PaymentIcon fontSize="small" />, render: () => <Box sx={{ whiteSpace: 'pre-wrap', fontSize: 14, color: 'text.secondary' }}>{paymentTerms}</Box> }] : []),
        ...(charges.length > 0 ? [{ id: 'charges', title: t('mweb.podDetails.sectionCharges'), icon: <ReceiptLongIcon fontSize="small" />, render: () => <PodPlaceChargesSection charges={charges} /> }] : []),
        ...(hasTicketDiscount ? [{ id: 'ticketDiscount', title: t('mweb.podDetails.sectionTicketDiscount'), icon: <LocalOfferIcon fontSize="small" />, render: () => <PodTicketDiscountSection unitPrice={unitPrice} pod={pod} /> }] : []),
      ] as const,
    [pod, club, hosts, attendees, spotFills, seatsByUser, isFree, priceCompute, offers, perks, charges, clubAdmins, paymentTerms, categoryCrumbs, hasTicketDiscount, unitPrice, t]
  );

  const [expanded, setExpanded] = useState<Set<string>>(new Set(['about']));
  const allOpen = expanded.size === sections.length;
  const toggle = (id: string, open: boolean) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (open) next.add(id);
      else next.delete(id);
      return next;
    });
  };
  const expandAll = () => setExpanded(new Set(sections.map((s) => s.id)));
  const collapseAll = () => setExpanded(new Set());

  return (
    <Box data-testid="pod-detail-accordions">
      <Stack direction="row" spacing={2} sx={{ justifyContent: 'flex-end', mb: 1 }}>
        <DuncitButton
          size="small"
          onClick={expandAll}
          disabled={allOpen}
          aria-label={t('mweb.podDetails.expandAllSections')}
          data-testid="pod-expand-all"
          sx={linkSx}
        >
          {t('mweb.podDetails.expandAll')}
        </DuncitButton>
        <DuncitButton
          size="small"
          onClick={collapseAll}
          disabled={expanded.size === 0}
          aria-label={t('mweb.podDetails.collapseAllSections')}
          data-testid="pod-collapse-all"
          sx={{ ...linkSx, color: 'text.secondary' }}
        >
          {t('mweb.podDetails.collapseAll')}
        </DuncitButton>
      </Stack>
      {sections.map((sec) => (
        <PodAccordion
          key={sec.id}
          id={sec.id}
          title={sec.title}
          icon={sec.icon}
          expanded={expanded.has(sec.id)}
          onChange={(open) => toggle(sec.id, open)}
        >
          {sec.render()}
        </PodAccordion>
      ))}
    </Box>
  );
}
