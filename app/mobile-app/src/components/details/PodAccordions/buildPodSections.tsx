import type { ComponentProps, ReactNode } from 'react';
import type { MaterialIcons } from '@expo/vector-icons';
import { Text } from 'tamagui';

import type { PodDetail, PodPerson, PodSpotFill } from '@/hooks/useDetails';
import type { useTranslation } from '@/hooks/useTranslation';
import { isPodExpired } from '@/utils/pod-format';
import { PodClubCard } from '@/components/details/PodClubCard';
import { ViewClubButton } from '@/components/details/ViewClubButton';
import { PodClubAdminsSection } from '@/components/details/PodClubAdminsSection';
import { PodTicketDiscountSection, showsTicketDiscount } from '../PodTicketDiscountSection';
import {
  AboutSection,
  AttendeesSection,
  buildAttendeePeople,
  buildHostPeople,
  ChargesSection,
  ChipList,
  HostsSection,
} from '@/components/details/PodSections';

import { PaymentDetails } from './PaymentDetails';

type IconName = ComponentProps<typeof MaterialIcons>['name'];
export interface Section {
  id: string;
  title: string;
  icon: IconName;
  content: ReactNode;
}

export interface PodSectionsArgs {
  pod: PodDetail;
  people: PodPerson[];
  spotFills: PodSpotFill[];
  seatsByUser?: Record<string, number>;
  categoryCrumbs: readonly string[];
  isFree: boolean;
  gstPct: number;
  currency: string;
  onOpenClub: () => void;
  onOpenProfile: (userId: string) => void;
  primary: string;
  success: string;
  t: ReturnType<typeof useTranslation>['t'];
}

/** The accordion sections for one pod, in display order; the optional ones
 * (ticket discount, terms, charges) only when the pod carries them. */
export function buildPodSections({
  pod,
  people,
  spotFills,
  seatsByUser,
  categoryCrumbs,
  isFree,
  gstPct,
  currency,
  onOpenClub,
  onOpenProfile,
  primary,
  success,
  t,
}: PodSectionsArgs): Section[] {
  const charges = pod.place_charges ?? [];
  const terms = pod.payment_terms?.trim();
  const attendeePeople = buildAttendeePeople(
    people,
    pod.pod_attendees,
    pod.pod_hosts_id,
    seatsByUser,
  );
  const hostPeople = buildHostPeople(people, pod.pod_hosts_id);
  const list: Section[] = [
    {
      id: 'about',
      title: t('mweb.podDetails.sectionAbout'),
      icon: 'info',
      content: <AboutSection pod={pod} />,
    },
    {
      id: 'club',
      title: t('mweb.podDetails.sectionClub'),
      icon: 'place',
      content: pod.club ? (
        <PodClubCard club={pod.club} categoryCrumbs={categoryCrumbs} onOpenClub={onOpenClub} />
      ) : (
        <ViewClubButton onOpenClub={onOpenClub} />
      ),
    },
    {
      id: 'clubAdmins',
      title: t('mweb.podDetails.sectionClubAdmins'),
      icon: 'admin-panel-settings',
      content: <PodClubAdminsSection admins={pod.club?.club_admins ?? []} />,
    },
    {
      id: 'offers',
      title: t('mweb.podDetails.sectionOffers'),
      icon: 'star',
      content: (
        <ChipList
          items={pod.what_this_pod_offers}
          emptyText={t('mweb.podDetails.offersEmpty')}
          tint={primary}
        />
      ),
    },
    {
      id: 'hosts',
      title: t('mweb.podDetails.sectionHosts'),
      icon: 'person',
      content: <HostsSection hosts={hostPeople} onOpenProfile={onOpenProfile} />,
    },
    {
      id: 'attendees',
      title: t('mweb.podDetails.sectionAttendees'),
      icon: 'groups',
      content: (
        <AttendeesSection
          people={attendeePeople}
          spots={pod.no_of_spots}
          expired={isPodExpired(pod.pod_date_time)}
          spotFills={spotFills}
          seatsTaken={pod.seats_taken ?? undefined}
          onOpenProfile={onOpenProfile}
        />
      ),
    },
    {
      id: 'perks',
      title: t('mweb.podDetails.sectionPerks'),
      icon: 'card-giftcard',
      content: (
        <ChipList
          items={pod.available_perks}
          emptyText={t('mweb.podDetails.perksEmpty')}
          tint={success}
        />
      ),
    },
    {
      id: 'payment',
      title: t('mweb.podDetails.sectionPayment'),
      icon: 'payments',
      content: (
        <PaymentDetails
          amount={pod.pod_amount}
          isFree={isFree}
          gstPct={gstPct}
          currency={currency}
        />
      ),
    },
  ];
  if (showsTicketDiscount(pod, isFree)) {
    list.push({
      id: 'ticketDiscount',
      title: t('mweb.podDetails.sectionTicketDiscount'),
      icon: 'local-offer',
      content: <PodTicketDiscountSection pod={pod} currency={currency} />,
    });
  }
  if (terms) {
    list.push({
      id: 'terms',
      title: t('mweb.podDetails.sectionTerms'),
      icon: 'payment',
      content: (
        <Text fontSize={13.5} color="$muted">
          {terms}
        </Text>
      ),
    });
  }
  if (charges.length > 0) {
    list.push({
      id: 'charges',
      title: t('mweb.podDetails.sectionCharges'),
      icon: 'receipt-long',
      content: <ChargesSection charges={charges} />,
    });
  }
  return list;
}
