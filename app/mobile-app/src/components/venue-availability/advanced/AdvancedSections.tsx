import { Text, YStack } from 'tamagui';
import { effectiveMaxAdvance, type VenueSettingsView } from '@duncit/slots';

import { useSlotTemplates } from '@/hooks/useSlotTemplates';
import { useTranslation } from '@/hooks/useTranslation';
import type { RecurringForm } from '../recurring/recurring-form';
import { AutoExtendSection } from './AutoExtendSection';
import { BulkActionsSection } from './BulkActionsSection';
import { TemplatesSection } from './TemplatesSection';
import { VenueRulesSection } from './VenueRulesSection';

interface Props {
  venueId: string;
  settings: VenueSettingsView;
  form: RecurringForm;
  patch: (p: Partial<RecurringForm>) => void;
  /** After a write to the venue itself (rules, auto-extend). */
  onVenueChanged: () => void;
  /** After a write to the slots (a bulk edit). */
  onSlotsChanged: () => void;
}

/** The four "Advanced settings" sections under the recurring form — venue
 * rules, auto-extend, templates and bulk actions — the twins of the MUI
 * accordions (rule 27). Templates are read once here, because both the
 * template section and auto-extend's default-template warning need them. */
export function AdvancedSections({
  venueId,
  settings,
  form,
  patch,
  onVenueChanged,
  onSlotsChanged,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const templates = useSlotTemplates(venueId);
  const advanceCap = effectiveMaxAdvance(settings.rules.max_advance_days);

  return (
    <YStack gap={10}>
      <Text fontSize={12} fontWeight="700" color="$muted" letterSpacing={1}>
        {t('availability.recurring.advancedSettings')}
      </Text>
      <VenueRulesSection venueId={venueId} rules={settings.rules} onSaved={onVenueChanged} />
      <AutoExtendSection
        venueId={venueId}
        autoExtend={settings.auto_extend}
        maxAdvanceDays={advanceCap}
        hasDefaultTemplate={templates.hasDefault}
        onSaved={onVenueChanged}
      />
      <TemplatesSection
        venueId={venueId}
        templates={templates.templates}
        form={form}
        patch={patch}
        onCreate={templates.create}
        onRemove={templates.remove}
      />
      <BulkActionsSection venueId={venueId} onDone={onSlotsChanged} />
    </YStack>
  );
}
