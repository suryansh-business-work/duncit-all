import { MaterialIcons } from '@expo/vector-icons';
import { useFieldArray, useFormContext } from 'react-hook-form';
import { XStack, YStack, useTheme } from 'tamagui';
import { leadQualityIssuesAt } from '@duncit/forms/schemas';
import { CRM_QUALITY_BAND_TONE_KEY } from '@duncit/utils';

import { ChoiceField } from '@/components/ChoiceField';
import { DuncitButton } from '@/components/DuncitButton';
import { SURFACE } from '@/components/surface';
import { TextField } from '@/components/TextField';
import {
  LEAD_QUALITY_EDITOR,
  type QualityFormValues,
} from '@/features/lead-quality-settings/editor';
import { BAND_TONES, QUALITY_LIMITS } from '@/generated/lead-quality-rules';
import { useTranslation } from '@/hooks/useTranslation';
import { useLiveIssues } from './LiveIssues';
import { RowControls } from './RowControls';
import { SectionHeading } from './SectionHeading';

/** The classification bands: a name, the score each starts at and its ring colour. */
export function BandsFields() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { control } = useFormContext<QualityFormValues>();
  const { fields, append, remove } = useFieldArray({ control, name: 'bands' });
  const { values, issues } = useLiveIssues();
  const tones = BAND_TONES.map((tone) => ({
    value: tone,
    label: t(CRM_QUALITY_BAND_TONE_KEY[tone]),
  }));
  return (
    <YStack gap="$3">
      <SectionHeading
        title={t('crm.leadQualitySettings.bandsTitle')}
        hint={t('crm.leadQualitySettings.bandsHint')}
        issues={leadQualityIssuesAt(issues, 'bands')}
        testID="lead-quality-bands"
      />
      {fields.map((field, index) => {
        const label = values.bands[index]?.label.trim() || t('crm.leadQualitySettings.untitled');
        const testID = `lead-quality-band-${index}`;
        return (
          <YStack key={field.id} {...SURFACE} gap="$2" testID={testID}>
            <XStack gap="$2" alignItems="flex-start">
              <YStack flex={1} gap="$2">
                <TextField
                  control={control}
                  name={`bands.${index}.label`}
                  label={t('crm.leadQualitySettings.bandLabel')}
                  testID={`${testID}-label`}
                />
                <TextField
                  control={control}
                  name={`bands.${index}.min`}
                  label={t('crm.leadQualitySettings.bandMin')}
                  testID={`${testID}-min`}
                />
              </YStack>
              <RowControls
                label={label}
                index={index}
                count={fields.length}
                onRemove={remove}
                testID={testID}
              />
            </XStack>
            <ChoiceField
              control={control}
              name={`bands.${index}.tone`}
              label={t('crm.leadQualitySettings.bandTone')}
              options={tones}
              testID={`${testID}-tone`}
            />
          </YStack>
        );
      })}
      <XStack>
        <DuncitButton
          label={t('crm.leadQualitySettings.addBand')}
          onPress={() => append(LEAD_QUALITY_EDITOR.blankBand())}
          disabled={fields.length >= QUALITY_LIMITS.bands}
          variant="ghost"
          size="sm"
          icon={<MaterialIcons name="add" size={18} color={theme.accentText?.val} />}
          testID="lead-quality-add-band"
        />
      </XStack>
    </YStack>
  );
}
