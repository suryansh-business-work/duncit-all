import { useMemo, useState, type ComponentProps, type ReactNode } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import type { PodDetail } from '@/hooks/useDetails';
import { useThemeColors } from '@/hooks/useThemeColors';
import { podOccurrenceLabel, podPriceLabel } from '@/utils/pod-format';
import { Accordion } from '@/components/details/Accordion';
import { PodClubCard } from '@/components/details/PodClubCard';
import {
  AboutSection,
  AttendeesSection,
  ChargesSection,
  ChipList,
  HostsSection,
} from '@/components/details/PodSections';

type IconName = ComponentProps<typeof MaterialIcons>['name'];
interface Section {
  id: string;
  title: string;
  icon: IconName;
  content: ReactNode;
}

/** The full pod-details accordion stack (about · club · offers · hosts ·
 * attendees · perks · payment · terms · charges) with expand/collapse-all —
 * RN port of mWeb's PodDetailAccordions. */
export function PodAccordions({
  pod,
  onOpenClub,
}: Readonly<{ pod: PodDetail; onOpenClub: () => void }>) {
  const { primary } = useThemeColors();

  const sections: Section[] = useMemo(() => {
    const charges = pod.place_charges ?? [];
    const terms = pod.payment_terms?.trim();
    const list: Section[] = [
      { id: 'about', title: 'About this pod', icon: 'info', content: <AboutSection pod={pod} /> },
      {
        id: 'club',
        title: 'Club details',
        icon: 'place',
        content: pod.club ? (
          <PodClubCard club={pod.club} onOpenClub={onOpenClub} />
        ) : (
          <XStack
            testID="pod-view-club"
            role="button"
            aria-label="View club"
            onPress={onOpenClub}
            alignItems="center"
            gap={8}
            pressStyle={{ opacity: 0.8 }}
          >
            <MaterialIcons name="groups" size={18} color={primary} />
            <Text fontSize={14} fontWeight="800" color="$primary">
              View club
            </Text>
          </XStack>
        ),
      },
      {
        id: 'offers',
        title: 'What this pod offers',
        icon: 'star',
        content: (
          <ChipList
            items={pod.what_this_pod_offers}
            emptyText="Details coming soon."
            tint="#ff5a5a"
          />
        ),
      },
      {
        id: 'hosts',
        title: 'Hosts',
        icon: 'person',
        content: <HostsSection hosts={pod.host_names} />,
      },
      {
        id: 'attendees',
        title: 'Attendees',
        icon: 'groups',
        content: <AttendeesSection going={pod.pod_attendees.length} spots={pod.no_of_spots} />,
      },
      {
        id: 'perks',
        title: 'Available perks',
        icon: 'card-giftcard',
        content: (
          <ChipList
            items={pod.available_perks}
            emptyText="No additional perks listed."
            tint="#22c55e"
          />
        ),
      },
      {
        id: 'payment',
        title: 'Payment details',
        icon: 'payments',
        content: (
          <YStack gap={4}>
            <Text fontSize={14} fontWeight="800" color="$color">
              {podPriceLabel(pod)}
            </Text>
            <Text fontSize={12.5} color="$muted">
              Occurrence: {podOccurrenceLabel(pod.pod_occurrence)}
            </Text>
          </YStack>
        ),
      },
    ];
    if (terms) {
      list.push({
        id: 'terms',
        title: 'Payment terms',
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
        title: 'Place charges',
        icon: 'receipt-long',
        content: <ChargesSection charges={charges} />,
      });
    }
    return list;
  }, [pod, onOpenClub, primary]);

  const [open, setOpen] = useState<Set<string>>(new Set(['about']));
  const toggle = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <YStack paddingHorizontal={16} paddingBottom={8}>
      <XStack justifyContent="flex-end" gap={18} marginBottom={10}>
        <Text
          testID="pod-expand-all"
          role="button"
          aria-label="Expand all"
          onPress={() => setOpen(new Set(sections.map((s) => s.id)))}
          fontSize={13}
          fontWeight="800"
          color="$primary"
        >
          Expand all
        </Text>
        <Text
          testID="pod-collapse-all"
          role="button"
          aria-label="Collapse all"
          onPress={() => setOpen(new Set())}
          fontSize={13}
          fontWeight="800"
          color="$muted"
        >
          Collapse all
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
