import { useMemo, useState, type ComponentProps, type ReactNode } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import type { PodDetail, PodPerson, PodSpotFill } from '@/hooks/useDetails';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { inclusiveGst } from '@/utils/checkout-math';
import { isPodExpired } from '@/utils/pod-format';
import { Accordion } from '@/components/details/Accordion';
import { PodClubCard } from '@/components/details/PodClubCard';
import { PodClubAdminsSection } from '@/components/details/PodClubAdminsSection';
import {
  AboutSection,
  AttendeesSection,
  buildAttendeePeople,
  buildHostPeople,
  ChargesSection,
  ChipList,
  HostsSection,
} from '@/components/details/PodSections';
import { PRESS_STYLE } from '@duncit/buttons-native';

type IconName = ComponentProps<typeof MaterialIcons>['name'];
interface Section {
  id: string;
  title: string;
  icon: IconName;
  content: ReactNode;
}

/** Customer payment details — GST + total only (mirrors mWeb's
 * PodPaymentDetailsSection). Internal fee/host/venue splits are never shown. */
function PaymentDetails({
  amount,
  isFree,
  gstPct,
  currency,
}: Readonly<{ amount: number; isFree: boolean; gstPct: number; currency: string }>) {
  const { t } = useTranslation();
  if (isFree || amount <= 0) {
    return (
      <Text fontSize={13.5} color="$muted">
        {t('mweb.podDetails.freeToJoin')}
      </Text>
    );
  }
  const money = (v: number) => `${currency}${v.toFixed(2)}`;
  return (
    <YStack gap={6}>
      <XStack justifyContent="space-between">
        <Text fontSize={13.5} color="$muted">
          {t('mweb.checkout.gst', { vars: { pct: gstPct } })}
        </Text>
        <Text fontSize={13.5} color="$color">
          {money(inclusiveGst(amount, gstPct))}
        </Text>
      </XStack>
      <XStack justifyContent="space-between">
        {/*
          Per SEAT, and it has to say so. This prices one ticket, while the bar
          on the same screen prices however many the seat picker holds — calling
          this "Total payable" put two different totals in front of the buyer
          and only one of them was what they would be charged.
        */}
        <Text fontSize={14} fontWeight="600" color="$color">
          {t('mweb.podDetails.pricePerSeat')}
        </Text>
        <Text fontSize={14} fontWeight="600" color="$color">
          {money(amount)}
        </Text>
      </XStack>
      <Text fontSize={11.5} color="$muted">
        {t('mweb.podDetails.inclusiveOfGst')}
      </Text>
    </YStack>
  );
}

/** The full pod-details accordion stack (about · club · offers · hosts ·
 * attendees · perks · payment · terms · charges) with expand/collapse-all —
 * RN port of mWeb's PodDetailAccordions. */
export function PodAccordions({
  pod,
  people,
  spotFills = [],
  seatsByUser,
  categoryCrumbs,
  isFree,
  gstPct,
  currency,
  onOpenClub,
  onOpenProfile,
}: Readonly<{
  pod: PodDetail;
  people: PodPerson[];
  /** Filled Backout seats — struck-through rows in the attendees section. */
  spotFills?: PodSpotFill[];
  /** Seats per attendee id, from podAttendeeSeats. */
  seatsByUser?: Record<string, number>;
  categoryCrumbs: readonly string[];
  isFree: boolean;
  gstPct: number;
  currency: string;
  onOpenClub: () => void;
  onOpenProfile: (userId: string) => void;
}>) {
  const { primary, success } = useThemeColors();
  const { t } = useTranslation();

  const sections: Section[] = useMemo(() => {
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
          <XStack
            testID="pod-view-club"
            role="button"
            aria-label={t('mweb.podDetails.viewClub')}
            onPress={onOpenClub}
            alignItems="center"
            gap={8}
            pressStyle={PRESS_STYLE.control}
          >
            <MaterialIcons name="groups" size={18} color={primary} />
            <Text fontSize={14} fontWeight="600" color="$primary">
              {t('mweb.podDetails.viewClub')}
            </Text>
          </XStack>
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
  }, [
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
  ]);

  const [open, setOpen] = useState<Set<string>>(new Set(['about']));
  const toggle = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <YStack paddingHorizontal={16} paddingBottom={8} paddingTop={8}>
      <XStack justifyContent="flex-end" gap={18} marginBottom={10}>
        <Text
          pressStyle={PRESS_STYLE.inline}
          testID="pod-expand-all"
          role="button"
          aria-label={t('mweb.podDetails.expandAll')}
          onPress={() => setOpen(new Set(sections.map((s) => s.id)))}
          fontSize={13}
          fontWeight="600"
          color="$primary"
        >
          {t('mweb.podDetails.expandAll')}
        </Text>
        <Text
          pressStyle={PRESS_STYLE.inline}
          testID="pod-collapse-all"
          role="button"
          aria-label={t('mweb.podDetails.collapseAll')}
          onPress={() => setOpen(new Set())}
          fontSize={13}
          fontWeight="600"
          color="$muted"
        >
          {t('mweb.podDetails.collapseAll')}
        </Text>
      </XStack>
      {sections.map((s) => (
        <Accordion
          key={s.id}
          title={s.title}
          icon={s.icon}
          open={open.has(s.id)}
          onToggle={() => toggle(s.id)}
          testID={`accordion-${s.id}`}
        >
          {s.content}
        </Accordion>
      ))}
    </YStack>
  );
}
