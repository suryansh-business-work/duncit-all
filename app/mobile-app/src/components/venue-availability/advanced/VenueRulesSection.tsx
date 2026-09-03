import { useState } from 'react';
import { Text, XStack, YStack } from 'tamagui';
import type { VenueRulesForm } from '@duncit/slots';

import { DuncitButton } from '@/components/DuncitButton';
import { LabeledInput } from '@/components/LabeledInput';
import { ToggleRow } from '@/components/ToggleRow';
import { UpdateVenueSettingsDocument } from '@/graphql/venue-availability';
import { useTranslation } from '@/hooks/useTranslation';
import { graphqlRequest } from '@/services/graphql.client';
import { ExpandableSection } from './ExpandableSection';

type NumKey =
  'buffer_minutes' | 'min_notice_minutes' | 'max_advance_days' | 'max_bookings_per_slot';
type BoolKey =
  | 'allow_instant_booking'
  | 'allow_waitlist'
  | 'booking_approval_required'
  | 'allow_multiple_bookings';

// A venue may schedule availability at most 60 days ahead.
const NUM_FIELDS: readonly { key: NumKey; labelKey: string; max?: number }[] = [
  { key: 'buffer_minutes', labelKey: 'availability.rules.bufferMinutes' },
  { key: 'min_notice_minutes', labelKey: 'availability.rules.minNotice' },
  { key: 'max_advance_days', labelKey: 'availability.rules.maxAdvance', max: 60 },
  { key: 'max_bookings_per_slot', labelKey: 'availability.rules.maxBookings' },
];

const TOGGLE_FIELDS: readonly { key: BoolKey; labelKey: string }[] = [
  { key: 'allow_instant_booking', labelKey: 'availability.rules.allowInstant' },
  { key: 'allow_waitlist', labelKey: 'availability.rules.allowWaitlist' },
  { key: 'booking_approval_required', labelKey: 'availability.rules.approvalRequired' },
  { key: 'allow_multiple_bookings', labelKey: 'availability.rules.allowMultiple' },
];

const clamp = (value: string, max?: number) =>
  Math.min(max ?? Number.POSITIVE_INFINITY, Math.max(0, Math.round(Number(value) || 0)));

const seedTexts = (rules: VenueRulesForm): Record<NumKey, string> => ({
  buffer_minutes: String(rules.buffer_minutes),
  min_notice_minutes: String(rules.min_notice_minutes),
  max_advance_days: String(rules.max_advance_days),
  max_bookings_per_slot: String(rules.max_bookings_per_slot),
});

interface Props {
  venueId: string;
  rules: VenueRulesForm;
  onSaved: () => void;
}

/** Buffer, booking window and advance-booking limits — the four numbers and
 * four switches `updateVenueSettings { rules }` takes. */
export function VenueRulesSection({ venueId, rules, onSaved }: Readonly<Props>) {
  const { t } = useTranslation();
  // Free text while typing so multi-digit entry is not snapped mid-keystroke;
  // clamped on save.
  const [texts, setTexts] = useState<Record<NumKey, string>>(() => seedTexts(rules));
  const [flags, setFlags] = useState<Record<BoolKey, boolean>>({
    allow_instant_booking: rules.allow_instant_booking,
    allow_waitlist: rules.allow_waitlist,
    booking_approval_required: rules.booking_approval_required,
    allow_multiple_bookings: rules.allow_multiple_bookings,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setSaving(true);
    setSaved(false);
    setError(null);
    const numbers = Object.fromEntries(
      NUM_FIELDS.map((field) => [field.key, clamp(texts[field.key], field.max)]),
    ) as Record<NumKey, number>;
    try {
      await graphqlRequest(
        UpdateVenueSettingsDocument,
        { venue_doc_id: venueId, input: { rules: { ...flags, ...numbers } } },
        { auth: true },
      );
      setTexts(seedTexts({ ...flags, ...numbers }));
      setSaved(true);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('availability.updateFailed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ExpandableSection
      testID="advanced-rules"
      icon="rule"
      title={t('availability.rules.title')}
      caption={t('availability.rules.caption')}
    >
      {NUM_FIELDS.map((field) => (
        <LabeledInput
          key={field.key}
          testID={`rules-${field.key}`}
          label={t(field.labelKey)}
          value={texts[field.key]}
          onChangeText={(next) => setTexts((current) => ({ ...current, [field.key]: next }))}
          keyboardType="numeric"
        />
      ))}
      <YStack gap={10}>
        {TOGGLE_FIELDS.map((field) => (
          <ToggleRow
            key={field.key}
            testID={`rules-${field.key}`}
            label={t(field.labelKey)}
            value={flags[field.key]}
            onChange={(next) => setFlags((current) => ({ ...current, [field.key]: next }))}
          />
        ))}
      </YStack>
      {error ? (
        <Text testID="rules-error" fontSize={12.5} color="$danger">
          {error}
        </Text>
      ) : null}
      {saved && !saving ? (
        <Text testID="rules-saved" fontSize={12.5} color="$success">
          {t('availability.rules.saved')}
        </Text>
      ) : null}
      <XStack>
        <DuncitButton
          testID="rules-save"
          label={saving ? t('availability.rules.saving') : t('availability.rules.save')}
          onPress={() => {
            save().catch(() => undefined);
          }}
          variant="outline"
          size="sm"
          disabled={saving}
          loading={saving}
        />
      </XStack>
    </ExpandableSection>
  );
}
