import { Text, XStack, YStack } from 'tamagui';
import { CRM_QUALITY_BAND_TONE_KEY, crmQualityTone } from '@duncit/utils';

import { SURFACE } from '@/components/surface';
import { ToneChip } from '@/components/ToneChip';
import type { QualityConfig } from '@/features/lead-quality-settings/editor';
import { useTranslation } from '@/hooks/useTranslation';
import { CriterionSummary } from './CriterionSummary';

function Heading({ children }: Readonly<{ children: string }>) {
  return (
    <Text fontWeight="700" fontSize="$5" role="heading">
      {children}
    </Text>
  );
}

/**
 * The published scoring model, read-only — what the portal shows in its
 * locked form while there is no draft: the criteria and their total, the
 * qualification rule and the classification bands. Edit starts a draft.
 */
export function ConfigSummary({ config }: Readonly<{ config: QualityConfig }>) {
  const { t } = useTranslation();
  const minScore = config.min_qualification_score;
  return (
    <YStack gap="$4" testID="lead-quality-summary">
      <YStack gap="$2">
        <Heading>{t('crm.leadQualitySettings.criteriaTitle')}</Heading>
        <Text color="$muted" fontSize="$2">
          {t('crm.leadQualitySettings.totalLabel', { vars: { total: config.weightage_total } })}
        </Text>
        {config.criteria.map((criterion, index) => (
          <CriterionSummary key={criterion.key} criterion={criterion} index={index} />
        ))}
      </YStack>
      <YStack gap="$2">
        <Heading>{t('crm.leadQualitySettings.qualificationTitle')}</Heading>
        <Text color="$muted" fontSize="$2">
          {typeof minScore === 'number'
            ? t('shell.a11y.fieldOf', {
                vars: { field: t('crm.leadQualitySettings.minScore'), name: minScore },
              })
            : t('crm.leadQualitySettings.gatesOnlyHint')}
        </Text>
      </YStack>
      <YStack gap="$2">
        <Heading>{t('crm.leadQualitySettings.bandsTitle')}</Heading>
        {config.bands.map((band) => {
          const tone = crmQualityTone(band.tone);
          return (
            <XStack key={band.key} {...SURFACE} alignItems="center" gap="$2">
              <YStack flex={1}>
                <Text fontWeight="600">{band.label}</Text>
                <Text color="$muted" fontSize="$2">
                  {t('shell.a11y.fieldOf', {
                    vars: { field: t('crm.leadQualitySettings.bandMin'), name: band.min },
                  })}
                </Text>
              </YStack>
              <ToneChip label={t(CRM_QUALITY_BAND_TONE_KEY[tone])} tone={tone} />
            </XStack>
          );
        })}
      </YStack>
    </YStack>
  );
}
