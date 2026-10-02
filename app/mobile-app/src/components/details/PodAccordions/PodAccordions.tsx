import { useMemo, useState } from 'react';
import { Text, XStack, YStack } from 'tamagui';

import type { PodDetail, PodPerson, PodSpotFill } from '@/hooks/useDetails';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { Accordion } from '@/components/details/Accordion';
import { PRESS_STYLE } from '@duncit/buttons-native';

import { buildPodSections, type Section } from './buildPodSections';

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

  const sections: Section[] = useMemo(
    () =>
      buildPodSections({
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
      }),
    [
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
    ],
  );

  const [open, setOpen] = useState<Set<string>>(new Set(['about']));
  const toggle = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <YStack paddingHorizontal={16} paddingBottom={8} paddingTop={20}>
      <XStack justifyContent="flex-end" gap={18} marginBottom={12}>
        <Text
          pressStyle={PRESS_STYLE.inline}
          testID="pod-expand-all"
          role="button"
          aria-label={t('mweb.podDetails.expandAll')}
          onPress={() => setOpen(new Set(sections.map((s) => s.id)))}
          fontSize={13}
          fontWeight="600"
          color="$accent"
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
