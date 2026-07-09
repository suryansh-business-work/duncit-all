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
import PodHostsSection from '../../components/pod-details/PodHostsSection';
import PodPlaceChargesSection from '../../components/pod-details/PodPlaceChargesSection';
import PodPaymentDetailsSection from '../../components/pod-details/PodPaymentDetailsSection';

interface Props {
  pod: any;
  club: any | null;
  hosts: any[];
  attendees: any[];
  isFree: boolean;
  priceCompute: any;
  categoryCrumbs: readonly string[];
}

export default function PodDetailAccordions({
  pod,
  club,
  hosts,
  attendees,
  isFree,
  priceCompute,
  categoryCrumbs,
}: Readonly<Props>) {
  const offers: string[] = pod.what_this_pod_offers ?? [];
  const perks: string[] = pod.available_perks ?? [];
  const charges = pod.place_charges ?? [];
  const paymentTerms = pod.payment_terms?.trim();

  const sections = useMemo(
    () =>
      [
        { id: 'about', title: 'About this pod', icon: <InfoIcon fontSize="small" />, render: () => <PodAboutSection description={pod.pod_description} info={pod.pod_info} /> },
        { id: 'club', title: 'Club details', icon: <PlaceIcon fontSize="small" />, render: () => <PodClubSection club={club} categoryCrumbs={categoryCrumbs} /> },
        { id: 'offers', title: 'What this pod offers', icon: <StarIcon fontSize="small" />, render: () => <PodChipList items={offers} emptyText="Details coming soon." color="primary" /> },
        { id: 'hosts', title: 'Hosts', icon: <PersonIcon fontSize="small" />, render: () => <PodHostsSection hosts={hosts} /> },
        { id: 'attendees', title: 'Attendees', icon: <GroupsIcon fontSize="small" />, render: () => <PodAttendeesSection attendees={attendees} attendeeIds={pod.pod_attendees ?? []} hostIds={pod.pod_hosts_id ?? []} totalSpots={pod.no_of_spots ?? 0} /> },
        { id: 'perks', title: 'Available perks', icon: <CardGiftcardIcon fontSize="small" />, render: () => <PodChipList items={perks} emptyText="No additional perks listed." color="success" /> },
        { id: 'payment', title: 'Payment details', icon: <PaymentIcon fontSize="small" />, render: () => <PodPaymentDetailsSection amount={Number(pod.pod_amount) || 0} isFree={isFree} priceCompute={priceCompute} /> },
        ...(paymentTerms ? [{ id: 'terms', title: 'Payment terms', icon: <PaymentIcon fontSize="small" />, render: () => <Box sx={{ whiteSpace: 'pre-wrap', fontSize: 14, color: 'text.secondary' }}>{paymentTerms}</Box> }] : []),
        ...(charges.length > 0 ? [{ id: 'charges', title: 'Place charges', icon: <ReceiptLongIcon fontSize="small" />, render: () => <PodPlaceChargesSection charges={charges} /> }] : []),
      ] as const,
    [pod, club, hosts, attendees, isFree, priceCompute, offers, perks, charges, paymentTerms, categoryCrumbs]
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
      <Stack direction="row" justifyContent="flex-end" spacing={1} sx={{ mb: 1 }}>
        <Button
          size="small"
          startIcon={<UnfoldMoreIcon />}
          onClick={expandAll}
          disabled={allOpen}
          aria-label="Expand all sections"
          sx={{ minHeight: 36 }}
        >
          Expand all
        </Button>
        <Button
          size="small"
          startIcon={<UnfoldLessIcon />}
          onClick={collapseAll}
          disabled={expanded.size === 0}
          aria-label="Collapse all sections"
          sx={{ minHeight: 36 }}
        >
          Collapse all
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
