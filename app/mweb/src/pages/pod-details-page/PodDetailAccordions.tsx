import { useMemo, useState } from 'react';
import { Box, Button, Stack } from '@mui/material';
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore';
import UnfoldLessIcon from '@mui/icons-material/UnfoldLess';
import PlaceIcon from '@mui/icons-material/Place';
import PersonIcon from '@mui/icons-material/Person';
import InfoIcon from '@mui/icons-material/Info';
import StarIcon from '@mui/icons-material/Star';
import CardGiftcardIcon from '@mui/icons-material/CardGiftcard';
import PaymentIcon from '@mui/icons-material/Payment';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import GroupsIcon from '@mui/icons-material/Groups';
import PodAccordion from '../../components/pod-details/PodAccordion';
import PodClubSection from '../../components/pod-details/PodClubSection';
import PodAboutSection from '../../components/pod-details/PodAboutSection';
import PodChipList from '../../components/pod-details/PodChipList';
import PodAttendeesSection from '../../components/pod-details/PodAttendeesSection';
import { isPodExpired } from '../../utils/podStatus';
import PodHostsSection from '../../components/pod-details/PodHostsSection';
import PodPlaceChargesSection from '../../components/pod-details/PodPlaceChargesSection';
import PodPaymentDetailsSection from '../../components/pod-details/PodPaymentDetailsSection';
import { useTranslation } from '../../i18n/useTranslation';

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
  const paymentTerms = pod.payment_terms?.trim();

  const sections = useMemo(
    () =>
      [
        { id: 'about', title: t('mweb.podDetails.sectionAbout'), icon: <InfoIcon fontSize="small" />, render: () => <PodAboutSection description={pod.pod_description} info={pod.pod_info} /> },
        { id: 'club', title: t('mweb.podDetails.sectionClub'), icon: <PlaceIcon fontSize="small" />, render: () => <PodClubSection club={club} categoryCrumbs={categoryCrumbs} /> },
        { id: 'offers', title: t('mweb.podDetails.sectionOffers'), icon: <StarIcon fontSize="small" />, render: () => <PodChipList items={offers} emptyText={t('mweb.podDetails.offersEmpty')} color="primary" /> },
        { id: 'hosts', title: t('mweb.podDetails.sectionHosts'), icon: <PersonIcon fontSize="small" />, render: () => <PodHostsSection hosts={hosts} /> },
        { id: 'attendees', title: t('mweb.podDetails.sectionAttendees'), icon: <GroupsIcon fontSize="small" />, render: () => <PodAttendeesSection attendees={attendees} attendeeIds={pod.pod_attendees ?? []} hostIds={pod.pod_hosts_id ?? []} totalSpots={pod.no_of_spots ?? 0} expired={isPodExpired(pod.pod_date_time)} spotFills={spotFills} seatsByUser={seatsByUser} seatsTaken={pod.seats_taken ?? undefined} /> },
        { id: 'perks', title: t('mweb.podDetails.sectionPerks'), icon: <CardGiftcardIcon fontSize="small" />, render: () => <PodChipList items={perks} emptyText={t('mweb.podDetails.perksEmpty')} color="success" /> },
        { id: 'payment', title: t('mweb.podDetails.sectionPayment'), icon: <PaymentIcon fontSize="small" />, render: () => <PodPaymentDetailsSection amount={Number(pod.pod_amount) || 0} isFree={isFree} priceCompute={priceCompute} /> },
        ...(paymentTerms ? [{ id: 'terms', title: t('mweb.podDetails.sectionTerms'), icon: <PaymentIcon fontSize="small" />, render: () => <Box sx={{ whiteSpace: 'pre-wrap', fontSize: 14, color: 'text.secondary' }}>{paymentTerms}</Box> }] : []),
        ...(charges.length > 0 ? [{ id: 'charges', title: t('mweb.podDetails.sectionCharges'), icon: <ReceiptLongIcon fontSize="small" />, render: () => <PodPlaceChargesSection charges={charges} /> }] : []),
      ] as const,
    [pod, club, hosts, attendees, spotFills, seatsByUser, isFree, priceCompute, offers, perks, charges, paymentTerms, categoryCrumbs, t]
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
    <Box>
      <Stack
        direction="row"
        spacing={1}
        sx={{
          justifyContent: "flex-end",
          mb: 1
        }}>
        <Button
          size="small"
          startIcon={<UnfoldMoreIcon />}
          onClick={expandAll}
          disabled={allOpen}
          aria-label={t('mweb.podDetails.expandAllSections')}
          sx={{ minHeight: 36 }}
        >
          {t('mweb.podDetails.expandAll')}
        </Button>
        <Button
          size="small"
          startIcon={<UnfoldLessIcon />}
          onClick={collapseAll}
          disabled={expanded.size === 0}
          aria-label={t('mweb.podDetails.collapseAllSections')}
          sx={{ minHeight: 36 }}
        >
          {t('mweb.podDetails.collapseAll')}
        </Button>
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
