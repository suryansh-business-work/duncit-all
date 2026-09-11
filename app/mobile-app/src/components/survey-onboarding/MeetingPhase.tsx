import { Input, Spinner, Text, TextArea, YStack } from 'tamagui';

import { DuncitButton } from '@/components/DuncitButton';
import { SurfaceCard } from '@/components/SurfaceCard';
import { useBottomInset } from '@/hooks/useBottomNavSpace';
import { useThemeColors } from '@/hooks/useThemeColors';
import type { ActiveSurvey, MeetingSlot } from '@/graphql/onboarding-survey';
import { CALM_FIELD } from './calmField';
import { MeetingPhoneFields } from './MeetingPhoneFields';
import { SlotPicker } from './SlotPicker';
import type { Answer } from './useOnboardingFlow';
import { useTranslation } from '@/hooks/useTranslation';
import { RefreshScrollView } from '@/components/PullToRefresh';

interface Props {
  survey: ActiveSurvey | null;
  answer: { get: (qid: string) => Answer };
  slots: MeetingSlot[];
  slotsLoading: boolean;
  selectedSlot: string;
  setSelectedSlot: (v: string) => void;
  name: string;
  setName: (v: string) => void;
  lockName: boolean;
  ext: string;
  phone: string;
  hasProfilePhone: boolean;
  onGoToProfile: () => void;
  notes: string;
  setNotes: (v: string) => void;
  busy: boolean;
  error: string | null;
  onSubmit: () => void;
}

/** Slot booking — shown after the survey; recaps the submitted answers on top.
 * Booked slots come back disabled; phone is required. */
export function MeetingPhase({
  survey,
  answer,
  slots,
  slotsLoading,
  selectedSlot,
  setSelectedSlot,
  name,
  setName,
  lockName,
  ext,
  phone,
  hasProfilePhone,
  onGoToProfile,
  notes,
  setNotes,
  busy,
  error,
  onSubmit,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const { primary } = useThemeColors();
  // "Book this slot" is the last row of this scroll and nothing floats over it,
  // so it only has to clear the Android navigation bar the edge-to-edge window
  // paints over the app — on top of the container's own 16pt padding.
  const bottomInset = useBottomInset();
  const answered = (survey?.questions ?? [])
    .filter((q) => q.type !== 'SECTION')
    .map((q) => {
      const a = answer.get(q.qid);
      const text = a.values.length ? a.values.join(', ') : a.value;
      return { qid: q.qid, label: q.label, text };
    })
    .filter((x) => x.text.trim() !== '');

  return (
    <RefreshScrollView
      contentContainerStyle={{ padding: 16, paddingBottom: bottomInset + 16, gap: 16 }}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
    >
      {answered.length > 0 && (
        <SurfaceCard gap={8}>
          <Text fontSize={12} fontWeight="600" color="$muted">
            YOUR SURVEY ANSWERS
          </Text>
          {answered.map((x) => (
            <YStack key={x.qid} gap={1}>
              <Text fontSize={12} color="$muted">
                {x.label}
              </Text>
              <Text fontSize={14} color="$color">
                {x.text}
              </Text>
            </YStack>
          ))}
        </SurfaceCard>
      )}

      <YStack gap={10}>
        {slotsLoading ? <Spinner testID="slots-loading" color={primary} /> : null}
        {!slotsLoading && slots.length === 0 ? (
          <Text testID="slots-empty" fontSize={13} color="$muted">
            No slots are open right now — please check back soon.
          </Text>
        ) : null}
        {slots.length > 0 ? (
          <SlotPicker slots={slots} value={selectedSlot} onChange={setSelectedSlot} />
        ) : null}

        <Text fontSize={14} fontWeight="600" color="$color">
          Your name
        </Text>
        <Input
          testID="meeting-name"
          aria-label={t('mweb.common.yourName')}
          value={name}
          onChangeText={setName}
          {...CALM_FIELD}
          disabled={lockName}
          opacity={lockName ? 0.6 : 1}
        />
        {lockName ? (
          <Text fontSize={12} color="$muted">
            From your profile.
          </Text>
        ) : null}
        <MeetingPhoneFields
          ext={ext}
          phone={phone}
          hasProfilePhone={hasProfilePhone}
          onGoToProfile={onGoToProfile}
        />
        <Text fontSize={14} fontWeight="600" color="$color">
          Notes (optional)
        </Text>
        <TextArea
          testID="meeting-notes"
          aria-label={t('mweb.surveyOnboarding.notes')}
          value={notes}
          onChangeText={setNotes}
          {...CALM_FIELD}
          minHeight={70}
        />
      </YStack>
      {error ? <Text color="$danger">{error}</Text> : null}
      <DuncitButton
        testID="primary-action"
        label={busy ? 'Booking…' : 'Book this slot'}
        size="lg"
        fullWidth
        disabled={busy}
        onPress={onSubmit}
      />
    </RefreshScrollView>
  );
}
