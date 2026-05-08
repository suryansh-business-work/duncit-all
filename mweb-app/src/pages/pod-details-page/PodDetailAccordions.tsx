import { useState } from 'react';
import { Box } from '@mui/material';
import EventIcon from '@mui/icons-material/Event';
import PlaceIcon from '@mui/icons-material/Place';
import GroupsIcon from '@mui/icons-material/Groups';
import PersonIcon from '@mui/icons-material/Person';
import InfoIcon from '@mui/icons-material/Info';
import StarIcon from '@mui/icons-material/Star';
import CardGiftcardIcon from '@mui/icons-material/CardGiftcard';
import PaymentIcon from '@mui/icons-material/Payment';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import PodAccordion from '../../components/pod-details/PodAccordion';
import PodMapSection from '../../components/pod-details/PodMapSection';
import PodClubSection from '../../components/pod-details/PodClubSection';
import PodAboutSection from '../../components/pod-details/PodAboutSection';
import PodChipList from '../../components/pod-details/PodChipList';
import PodAttendeesSection from '../../components/pod-details/PodAttendeesSection';
import PodHostsSection from '../../components/pod-details/PodHostsSection';
import PodPlaceChargesSection from '../../components/pod-details/PodPlaceChargesSection';

interface Props {
  pod: any;
  club: any | null;
  locationName?: string | null;
  hosts: any[];
}

export default function PodDetailAccordions({ pod, club, locationName, hosts }: Props) {
  const [expanded, setExpanded] = useState<string | false>('about');
  const handle = (id: string) => (next: string | false) =>
    setExpanded(next === id ? id : next);

  const offers: string[] = pod.what_this_pod_offers ?? [];
  const perks: string[] = pod.available_perks ?? [];
  const charges = pod.place_charges ?? [];
  const paymentTerms = pod.payment_terms?.trim();

  return (
    <Box>
      <PodAccordion
        id="about"
        title="About this pod"
        icon={<InfoIcon fontSize="small" />}
        expanded={expanded}
        onChange={handle('about')}
      >
        <PodAboutSection description={pod.pod_description} info={pod.pod_info} />
      </PodAccordion>

      <PodAccordion
        id="map"
        title="When, where & map"
        icon={<EventIcon fontSize="small" />}
        expanded={expanded}
        onChange={handle('map')}
      >
        <PodMapSection pod={pod} locationName={locationName} />
      </PodAccordion>

      <PodAccordion
        id="club"
        title="Club details"
        icon={<PlaceIcon fontSize="small" />}
        expanded={expanded}
        onChange={handle('club')}
      >
        <PodClubSection club={club} />
      </PodAccordion>

      <PodAccordion
        id="offers"
        title="What this pod offers"
        icon={<StarIcon fontSize="small" />}
        expanded={expanded}
        onChange={handle('offers')}
      >
        <PodChipList items={offers} emptyText="Details coming soon." color="primary" />
      </PodAccordion>

      <PodAccordion
        id="attendees"
        title="Attendees"
        icon={<GroupsIcon fontSize="small" />}
        expanded={expanded}
        onChange={handle('attendees')}
      >
        <PodAttendeesSection
          attendeeIds={pod.pod_attendees ?? []}
          totalSpots={pod.no_of_spots ?? 0}
        />
      </PodAccordion>

      <PodAccordion
        id="hosts"
        title="Hosts"
        icon={<PersonIcon fontSize="small" />}
        expanded={expanded}
        onChange={handle('hosts')}
      >
        <PodHostsSection hosts={hosts} />
      </PodAccordion>

      <PodAccordion
        id="perks"
        title="Available perks"
        icon={<CardGiftcardIcon fontSize="small" />}
        expanded={expanded}
        onChange={handle('perks')}
      >
        <PodChipList
          items={perks}
          emptyText="No additional perks listed."
          color="success"
        />
      </PodAccordion>

      {paymentTerms && (
        <PodAccordion
          id="terms"
          title="Payment terms"
          icon={<PaymentIcon fontSize="small" />}
          expanded={expanded}
          onChange={handle('terms')}
        >
          <Box sx={{ whiteSpace: 'pre-wrap', fontSize: 14, color: 'text.secondary' }}>
            {paymentTerms}
          </Box>
        </PodAccordion>
      )}

      {charges.length > 0 && (
        <PodAccordion
          id="charges"
          title="Place charges"
          icon={<ReceiptLongIcon fontSize="small" />}
          expanded={expanded}
          onChange={handle('charges')}
        >
          <PodPlaceChargesSection charges={charges} />
        </PodAccordion>
      )}
    </Box>
  );
}
