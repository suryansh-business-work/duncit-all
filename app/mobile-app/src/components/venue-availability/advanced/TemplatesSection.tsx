import { useState } from 'react';
import { Text, XStack, YStack } from 'tamagui';

import { DuncitButton } from '@/components/DuncitButton';
import { RowIconButton } from '@/components/host-manage/ActionRow';
import { LabeledInput } from '@/components/LabeledInput';
import type { SlotTemplate, SlotTemplateInput } from '@/hooks/useSlotTemplates';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { newTimeRange, toInt, type RecurringForm } from '../recurring/recurring-form';
import { ExpandableSection } from './ExpandableSection';

interface Props {
  venueId: string;
  templates: readonly SlotTemplate[];
  form: RecurringForm;
  patch: (p: Partial<RecurringForm>) => void;
  onCreate: (input: SlotTemplateInput) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
}

/**
 * Save the current setup as a template, or apply a saved one. Templates
 * capture the schedule skeleton (weekdays + the first time range + a base
 * price); applying sets one time slot and that base price on every space.
 */
export function TemplatesSection({
  venueId,
  templates,
  form,
  patch,
  onCreate,
  onRemove,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const { muted } = useThemeColors();
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apply = (template: SlotTemplate) =>
    patch({
      weekdays: [...template.config.weekdays],
      timeSlots: [newTimeRange(template.config.start_time, template.config.end_time)],
      spaces: form.spaces.map((space) => ({
        ...space,
        price: String(template.config.default_price),
      })),
      skipWeeklyOff: template.config.skip_weekly_off,
      skipHolidays: template.config.skip_holidays,
    });

  const save = async () => {
    const first = form.timeSlots[0];
    const basePrice = form.spaces.find((space) => space.enabled) ?? form.spaces[0];
    setSaving(true);
    setError(null);
    try {
      await onCreate({
        venue_id: venueId,
        name: name.trim(),
        config: {
          weekdays: form.weekdays,
          start_time: first?.start ?? '',
          end_time: first?.end ?? '',
          default_price: toInt(basePrice?.price ?? '0'),
          per_day_price: [],
          skip_weekly_off: form.skipWeeklyOff,
          skip_holidays: form.skipHolidays,
        },
      });
      setName('');
    } catch (e) {
      setError(e instanceof Error ? e.message : t('availability.updateFailed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ExpandableSection
      testID="advanced-templates"
      icon="bookmark-border"
      title={t('availability.templates.title')}
      caption={t('availability.templates.caption')}
    >
      {templates.map((template) => (
        <XStack key={template.id} testID={`template-${template.id}`} alignItems="center" gap={8}>
          <Text flex={1} fontSize={13.5} fontWeight="600" color="$color" numberOfLines={1}>
            {template.name}
          </Text>
          {template.is_default ? (
            <XStack
              paddingHorizontal={8}
              paddingVertical={2}
              borderRadius={999}
              backgroundColor="$primary"
            >
              <Text fontSize={10.5} fontWeight="700" color="$onPrimary">
                {t('availability.templates.default')}
              </Text>
            </XStack>
          ) : null}
          <DuncitButton
            testID={`template-${template.id}-use`}
            label={t('availability.templates.use')}
            onPress={() => apply(template)}
            variant="ghost"
            size="sm"
          />
          <RowIconButton
            testID={`template-${template.id}-delete`}
            icon="delete-outline"
            label={t('availability.templates.delete', { vars: { name: template.name } })}
            tint={muted}
            onPress={() => {
              onRemove(template.id).catch(() => undefined);
            }}
          />
        </XStack>
      ))}
      {error ? (
        <Text testID="template-error" fontSize={12.5} color="$danger">
          {error}
        </Text>
      ) : null}
      <YStack gap={8}>
        <LabeledInput
          testID="template-name"
          label={t('availability.templates.name')}
          value={name}
          onChangeText={setName}
        />
        <XStack>
          <DuncitButton
            testID="template-save"
            label={saving ? t('availability.templates.saving') : t('availability.templates.save')}
            onPress={() => {
              save().catch(() => undefined);
            }}
            variant="outline"
            size="sm"
            disabled={saving || name.trim().length === 0}
            loading={saving}
          />
        </XStack>
      </YStack>
    </ExpandableSection>
  );
}
