import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Text, YStack } from 'tamagui';
import { fireAndForget, logs } from '@duncit/logs';
import { crmFormatPoints } from '@duncit/utils';

import { DuncitButton } from '@/components/DuncitButton';
import { RADII } from '@/constants/design';
import {
  LeadEvidenceFields,
  leadEvidenceDecision,
  leadEvidenceDefaults,
  makeLeadEvidenceSchema,
  type LeadEvidenceValues,
} from '@/forms/lead-evidence';
import { useTranslation } from '@/hooks/useTranslation';
import { formResolver } from '@/utils/form-resolver';
import { SheetModal } from '../parts/SheetModal';
import type { LeadQualityState, QualityEvidence, QualityItem } from './useLeadQuality';

interface Props {
  item: QualityItem;
  evidence: QualityEvidence | undefined;
  actions: Pick<LeadQualityState, 'record' | 'recording'>;
  onClose: () => void;
}

/** Why the server refused the last save, one line per problem (the portal's refusal alert). */
function Refusals({ messages }: Readonly<{ messages: readonly string[] }>) {
  const { t } = useTranslation();
  if (messages.length === 0) return null;
  return (
    <YStack
      backgroundColor="$dangerSoft"
      borderRadius={RADII.sm}
      padding="$3"
      gap="$1"
      role="alert"
      testID="evidence-refused"
    >
      <Text color="$danger" fontWeight="700">
        {t('crm.leadQualityTab.refused')}
      </Text>
      {messages.map((message) => (
        <Text key={message} color="$danger">
          {message}
        </Text>
      ))}
    </YStack>
  );
}

/**
 * Records one item's evidence. The sheet stays open with the server's
 * refusals when a decision is not saved, and closes once it is (the score
 * behind it is recalculated by then).
 */
export function EvidenceSheet({ item, evidence, actions, onClose }: Readonly<Props>) {
  const { t } = useTranslation();
  const resolver = useMemo(() => formResolver<LeadEvidenceValues>(makeLeadEvidenceSchema(t)), [t]);
  const { control, handleSubmit } = useForm({
    defaultValues: leadEvidenceDefaults(evidence),
    resolver,
    mode: 'onSubmit',
  });
  const [refusals, setRefusals] = useState<string[]>([]);

  const save = async (values: LeadEvidenceValues) => {
    setRefusals([]);
    const refused = await actions.record(leadEvidenceDecision(item.key, values));
    if (refused.length > 0) {
      setRefusals(refused);
      return;
    }
    onClose();
  };

  return (
    <SheetModal
      open
      title={t('crm.leadQualityTab.formTitle')}
      busy={actions.recording}
      onClose={onClose}
      testID="evidence-sheet"
      footer={
        <>
          <DuncitButton
            label={t('shell.common.cancel')}
            onPress={onClose}
            variant="ghost"
            disabled={actions.recording}
            testID="evidence-cancel"
          />
          <DuncitButton
            label={t('shell.common.save')}
            onPress={() =>
              fireAndForget(handleSubmit(save)(), logs.mobileApp, 'crm-app/EvidenceSheet', 'save')
            }
            loading={actions.recording}
            testID="evidence-save"
          />
        </>
      }
    >
      <Text color="$muted">
        {t('crm.leadQualityTab.formItem', {
          vars: { name: item.name, points: crmFormatPoints(item.points) },
        })}
      </Text>
      <Refusals messages={refusals} />
      <LeadEvidenceFields control={control} />
    </SheetModal>
  );
}
