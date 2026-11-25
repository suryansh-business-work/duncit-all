import type { Control, FieldArrayWithId } from 'react-hook-form';
import { Text, XStack, YStack } from 'tamagui';
import { crmEmailVariablesFor, crmForeignEmailVariables } from '@duncit/utils';

import { DuncitButton } from '@/components/DuncitButton';
import { Notice } from '@/components/email-templates/Notice';
import type { TemplateDraft, TemplateVariable } from '@/features/email-templates/draft';
import { useTranslation } from '@/hooks/useTranslation';
import { DeclaredVariables } from './DeclaredVariables';
import { VariableChips } from './VariableChips';

interface Props {
  target: string;
  control: Control<TemplateDraft>;
  fields: FieldArrayWithId<TemplateDraft, 'variables'>[];
  values: readonly TemplateVariable[];
  declared: ReadonlySet<string>;
  detected: readonly string[];
  onToggle: (slug: string) => void;
  onSync: () => void;
  onRemove: (index: number) => void;
}

/**
 * The portal's Variables tab: placeholders found in the MJML (red when the
 * audience does not offer them), the variables offered for the audience, then
 * each declared variable's default value, key and description.
 */
export function VariablesPane({
  target,
  control,
  fields,
  values,
  declared,
  detected,
  onToggle,
  onSync,
  onRemove,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const offered = crmEmailVariablesFor(target);
  const knownSlugs = new Set(offered.map((v) => v.slug));
  const foreign = crmForeignEmailVariables(detected, target);
  const targetNoun = target === 'VENUE' ? t('crm.common.venue') : t('crm.common.host');
  const foreignVars = {
    count: foreign.length,
    vars: { names: foreign.join(', '), target: targetNoun },
  };
  return (
    <YStack gap="$3">
      <XStack alignItems="center" gap="$2">
        <Text flex={1} fontWeight="700" role="heading">
          {t('crm.emailTemplates.detectedInTemplate')}
        </Text>
        <DuncitButton
          label={t('crm.emailTemplates.syncAll')}
          onPress={onSync}
          variant="ghost"
          size="sm"
          disabled={detected.length === 0}
          testID="variables-sync"
        />
      </XStack>
      <VariableChips
        items={detected.map((slug) => ({ slug }))}
        declared={declared}
        onToggle={onToggle}
        knownSlugs={knownSlugs}
        emptyHint={t('crm.emailTemplates.noPlaceholdersFound')}
        testID="detected-chip"
      />
      {foreign.length > 0 ? (
        <Notice tone="warning" testID="variables-foreign">
          {target === 'STATIC'
            ? t('crm.emailTemplates.foreignInStatic', foreignVars)
            : t('crm.emailTemplates.foreignForTarget', foreignVars)}
        </Notice>
      ) : null}
      {target === 'STATIC' ? (
        <Text color="$muted" fontSize="$2">
          {t('crm.emailTemplates.staticTemplateNoLeadVariablesDetected')}
        </Text>
      ) : (
        <VariableChips
          title={t('crm.emailTemplates.availableFor', { vars: { target: targetNoun } })}
          items={offered.map((v) => ({ slug: v.slug, label: t(v.labelKey) }))}
          declared={declared}
          onToggle={onToggle}
          emptyHint={t('crm.emailTemplates.none')}
          testID="available-chip"
        />
      )}
      <YStack height={1} backgroundColor="$borderColor" />
      <DeclaredVariables control={control} fields={fields} values={values} onRemove={onRemove} />
    </YStack>
  );
}
