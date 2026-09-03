import { useState } from 'react';
import { Text, XStack } from 'tamagui';
import type { VenueAutoExtendForm } from '@duncit/slots';

import { DuncitButton } from '@/components/DuncitButton';
import { LabeledInput } from '@/components/LabeledInput';
import { ToggleRow } from '@/components/ToggleRow';
import { UpdateVenueSettingsDocument } from '@/graphql/venue-availability';
import { useTranslation } from '@/hooks/useTranslation';
import { graphqlRequest } from '@/services/graphql.client';
import { appNow } from '@/utils/app-formatter';
import { dayFromKey, dayKeyOf } from '../availability-grid';
import { DateTimePickerField } from '../DateTimePickerField';
import { ExpandableSection } from './ExpandableSection';

const clampDays = (value: string, max: number) =>
  Math.min(max, Math.max(1, Math.round(Number(value) || 1)));

interface Props {
  venueId: string;
  autoExtend: VenueAutoExtendForm;
  maxAdvanceDays: number;
  /** Auto-extend rolls the DEFAULT template forward; without one it does nothing. */
  hasDefaultTemplate: boolean;
  onSaved: () => void;
}

/** "Future availability" — keep slots published ahead automatically. */
export function AutoExtendSection({
  venueId,
  autoExtend,
  maxAdvanceDays,
  hasDefaultTemplate,
  onSaved,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const [enabled, setEnabled] = useState(autoExtend.enabled);
  const [horizonText, setHorizonText] = useState(String(autoExtend.horizon_days));
  const [until, setUntil] = useState(autoExtend.until);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setSaving(true);
    setSaved(false);
    setError(null);
    const horizon = clampDays(horizonText, maxAdvanceDays);
    setHorizonText(String(horizon));
    try {
      await graphqlRequest(
        UpdateVenueSettingsDocument,
        {
          venue_doc_id: venueId,
          input: {
            auto_extend: {
              enabled,
              horizon_days: horizon,
              until,
              template_id: autoExtend.template_id,
            },
          },
        },
        { auth: true },
      );
      setSaved(true);
      onSaved();
    } catch {
      setError(t('availability.autoExtend.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ExpandableSection
      testID="advanced-auto-extend"
      icon="event-repeat"
      title={t('availability.autoExtend.title')}
      caption={t('availability.autoExtend.caption')}
    >
      <ToggleRow
        testID="auto-extend-enabled"
        label={t('availability.autoExtend.toggle')}
        value={enabled}
        onChange={(next) => {
          setSaved(false);
          setEnabled(next);
        }}
      />
      <Text fontSize={12} color="$muted">
        {t('availability.autoExtend.body', { vars: { days: maxAdvanceDays } })}
      </Text>
      {enabled && !hasDefaultTemplate ? (
        <Text testID="auto-extend-no-default" fontSize={12} color="$warning">
          {t('availability.autoExtend.noDefaultTemplate')}
        </Text>
      ) : null}
      <LabeledInput
        testID="auto-extend-horizon"
        label={t('availability.autoExtend.horizon', { vars: { days: maxAdvanceDays } })}
        value={horizonText}
        onChangeText={(next) => {
          setSaved(false);
          setHorizonText(next);
        }}
        keyboardType="numeric"
        disabled={!enabled}
      />
      <DateTimePickerField
        testID="auto-extend-until"
        label={t('availability.autoExtend.stopOn')}
        value={until ? dayFromKey(until) : null}
        onChange={(picked) => {
          setSaved(false);
          setUntil(dayKeyOf(picked));
        }}
        minDateTime={appNow()}
        disabled={!enabled}
      />
      {enabled && until ? (
        <XStack>
          <DuncitButton
            testID="auto-extend-clear"
            label={t('availability.autoExtend.clear')}
            onPress={() => setUntil('')}
            variant="ghost"
            tone="neutral"
            size="sm"
          />
        </XStack>
      ) : null}
      {error ? (
        <Text testID="auto-extend-error" fontSize={12.5} color="$danger">
          {error}
        </Text>
      ) : null}
      {saved && !saving ? (
        <Text testID="auto-extend-saved" fontSize={12.5} color="$success">
          {t('availability.autoExtend.saved')}
        </Text>
      ) : null}
      <XStack>
        <DuncitButton
          testID="auto-extend-save"
          label={saving ? t('availability.autoExtend.saving') : t('availability.autoExtend.save')}
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
