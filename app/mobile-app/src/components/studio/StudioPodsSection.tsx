import { useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Spinner, Text, XStack, YStack } from 'tamagui';
import { venueCancelDisabledText } from '@duncit/utils';

import { useDateFormat } from '@/hooks/useDateFormat';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { asVenuePodRow, type StudioPod } from './studio-pods';
import { StudioPodFigures } from './StudioPodFigures';
import { StudioPodActionsSheet } from './StudioPodActionsSheet';
import { StudioPodRow } from './StudioPodRow';
import type { StudioPodsState } from './useStudioPods';
import { PRESS_STYLE } from '@duncit/buttons-native';

/** Which studio is rendering — the only thing that differs between the two. */
export type StudioPodsVariant = 'VENUE' | 'CLUB';

const VARIANT_COPY = {
  VENUE: {
    title: 'mweb.studioPods.venueTitle',
    subtitle: 'mweb.studioPods.venueSubtitle',
    empty: 'mweb.studioPods.venueEmpty',
    scope: 'mweb.studioPods.venues',
  },
  CLUB: {
    title: 'mweb.studioPods.clubTitle',
    subtitle: 'mweb.studioPods.clubSubtitle',
    empty: 'mweb.studioPods.clubEmpty',
    scope: 'mweb.studioPods.clubs',
  },
} as const;

/**
 * The per-pod actions a studio may offer.
 *
 * Both studios now offer at least one — a venue owner can cancel or ask for a
 * different venue, a club admin can ask for a different club admin — so the
 * overflow sheet appears in both. `onRequestChange` is what opens it; the
 * studio supplies its own LABEL because a venue and a club admin are asking for
 * different things.
 */
interface PodActions {
  onOpenPod?: (pod: StudioPod) => void;
  onCancelPod?: (pod: StudioPod) => void;
  onRequestChange?: (pod: StudioPod) => void;
  requestChangeLabel?: string;
}

interface StudioPodsBodyProps extends PodActions {
  state: StudioPodsState;
  emptyKey: string;
  scopeKey: string;
  testID: string;
}

/** Loading / error / empty / loaded — hoisted so the section itself stays a flat
 * header + body and never nests these branches (rule 26g). */
function StudioPodsBody({
  state,
  emptyKey,
  scopeKey,
  testID,
  onOpenPod,
  onCancelPod,
  onRequestChange,
  requestChangeLabel,
}: Readonly<StudioPodsBodyProps>) {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat();
  const { primary } = useThemeColors();
  const [actionsPod, setActionsPod] = useState<StudioPod | null>(null);

  if (state.isLoading) {
    return <Spinner testID={`${testID}-loading`} color="$primary" />;
  }

  if (state.hasError) {
    return (
      <YStack gap={10} alignItems="flex-start">
        <Text testID={`${testID}-error`} fontSize={13} color="$danger">
          {t('mweb.studioPods.error')}
        </Text>
        <XStack
          testID={`${testID}-retry`}
          role="button"
          aria-label={t('mweb.studioPods.retry')}
          onPress={state.refetch}
          alignItems="center"
          gap={6}
          height={36}
          paddingHorizontal={14}
          borderRadius={999}
          borderWidth={1}
          borderColor="$primary"
          pressStyle={PRESS_STYLE.control}
        >
          <MaterialIcons name="refresh" size={16} color={primary} />
          <Text fontSize={13} fontWeight="600" color="$primary">
            {t('mweb.studioPods.retry')}
          </Text>
        </XStack>
      </YStack>
    );
  }

  // The list is capped server-side while the figures count every pod, so the
  // difference is stated rather than left to look like missing data.
  const capped = state.figures.total > state.pods.length;
  // A venue owner may only pull the plug before the pod starts (shared rule).
  // The sheet SHOWS the action either way and states why it is closed — the row
  // used to hide it, so an owner never learned the reason (rule 27, mWeb twin).
  const cancelWhy = actionsPod
    ? (venueCancelDisabledText(asVenuePodRow(actionsPod), t) ?? undefined)
    : undefined;

  return (
    <YStack gap={12}>
      <StudioPodFigures
        testID={`${testID}-figures`}
        figures={state.figures}
        scopeLabelKey={scopeKey}
      />
      {state.pods.length === 0 ? (
        <Text testID={`${testID}-empty`} fontSize={13} color="$muted">
          {t(emptyKey)}
        </Text>
      ) : null}
      {capped ? (
        <Text testID={`${testID}-capped`} fontSize={11.5} color="$muted">
          {t('mweb.studioPods.showingLatest', { vars: { pods: state.pods.length } })}
        </Text>
      ) : null}
      {state.pods.map((pod) => (
        <StudioPodRow
          key={pod.id}
          testID={`${testID}-row-${pod.id}`}
          pod={pod}
          when={formatDateTime(pod.pod_date_time)}
          currencySymbol={state.figures.currency_symbol}
          onOpen={onOpenPod ? () => onOpenPod(pod) : undefined}
          onOpenActions={onCancelPod || onRequestChange ? () => setActionsPod(pod) : undefined}
        />
      ))}
      <StudioPodActionsSheet
        pod={actionsPod}
        onClose={() => setActionsPod(null)}
        onCancel={
          onCancelPod && actionsPod
            ? () => {
                const pod = actionsPod;
                setActionsPod(null);
                onCancelPod(pod);
              }
            : undefined
        }
        cancelDisabledText={cancelWhy}
        onRequestChange={
          onRequestChange && actionsPod
            ? () => {
                const pod = actionsPod;
                setActionsPod(null);
                onRequestChange(pod);
              }
            : undefined
        }
        requestChangeLabel={requestChangeLabel}
      />
    </YStack>
  );
}

interface StudioPodsSectionProps extends PodActions {
  variant: StudioPodsVariant;
  state: StudioPodsState;
  testID: string;
}

/**
 * The pod section both partner studios render: a figures strip over the pods in
 * scope, then every pod as a row. Venue Studio and Club Studio differ only in
 * their copy, their query and their actions — the numbers, the row and the
 * states are one component, so mWeb has one section to mirror (rules 27 + 34).
 */
export function StudioPodsSection({
  variant,
  state,
  testID,
  onOpenPod,
  onCancelPod,
  onRequestChange,
  requestChangeLabel,
}: Readonly<StudioPodsSectionProps>) {
  const { t } = useTranslation();
  const copy = VARIANT_COPY[variant];

  return (
    <YStack testID={testID} gap={12}>
      <YStack gap={2}>
        <Text fontSize={16} fontWeight="700" color="$color">
          {t(copy.title)}
        </Text>
        <Text fontSize={11.5} color="$muted">
          {t(copy.subtitle)}
        </Text>
      </YStack>
      <StudioPodsBody
        state={state}
        emptyKey={copy.empty}
        scopeKey={copy.scope}
        testID={testID}
        onOpenPod={onOpenPod}
        onCancelPod={onCancelPod}
        onRequestChange={onRequestChange}
        requestChangeLabel={requestChangeLabel}
      />
    </YStack>
  );
}
