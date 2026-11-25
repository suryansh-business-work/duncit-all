import { fireAndForget, logs } from '@duncit/logs';
import { TextArea, Text, XStack, YStack } from 'tamagui';
import type { CrmAiLeadEntity } from '@duncit/utils';

import { AuthAlert } from '@/screens/auth/AuthAlert';
import { DuncitButton } from '@/components/DuncitButton';
import { useAiFill } from '@/features/leads-list/useAiFill';
import { useTranslation } from '@/hooks/useTranslation';
import { LeadListAiRowCard } from './LeadListAiRowCard';
import { LeadListSheet } from './LeadListSheet';

const SCOPE = 'crm-app/LeadListAiSheet';

interface Props {
  open: boolean;
  entity: CrmAiLeadEntity;
  onClose: () => void;
  /** Leads were created: the listing reloads and says how many. */
  onSaved: (count: number) => void;
}

/** Leads › Fill with AI: paste text, check what the AI read, create the leads (the portal's dialog). */
export function LeadListAiSheet({ open, entity, onClose, onSaved }: Readonly<Props>) {
  const { t } = useTranslation();
  const ai = useAiFill(entity, t);
  const busy = ai.busy !== null;
  const title =
    entity === 'VENUE_LEAD'
      ? t('crm.venueLeads.fillVenueLeadsWithAi')
      : t('crm.hostLeads.fillHostLeadsWithAi');
  const close = () => {
    ai.reset();
    onClose();
  };
  const save = async () => {
    const { created, left } = await ai.save();
    if (created > 0) onSaved(created);
    if (left === 0) close();
  };
  return (
    <LeadListSheet open={open} title={title} onClose={close} busy={busy} testID="ai-sheet">
      {ai.error ? <AuthAlert message={ai.error} testID="ai-error" /> : null}
      {ai.step === 'input' ? (
        <YStack gap="$3">
          <Text color="$muted">
            {entity === 'VENUE_LEAD' ? t('crm.aiFill.introVenues') : t('crm.aiFill.introHosts')}
          </Text>
          <TextArea
            value={ai.text}
            onChangeText={ai.setText}
            placeholder={t('crm.components.pasteTextHere')}
            aria-label={t('crm.components.pasteTextHere')}
            placeholderTextColor="$muted"
            borderColor="$inputBorder"
            minHeight={180}
            testID="ai-text"
          />
          <DuncitButton
            label={ai.busy === 'parsing' ? t('crm.aiFill.parsing') : t('crm.aiFill.parse')}
            onPress={() => fireAndForget(ai.parse(), logs.mobileApp, SCOPE, 'parse')}
            loading={ai.busy === 'parsing'}
            fullWidth
            testID="ai-parse"
          />
        </YStack>
      ) : (
        <YStack gap="$3">
          <Text color="$muted" aria-live="polite">
            {t('crmApp.leadList.aiFound', { count: ai.rows.length })}
          </Text>
          {ai.rows.map((row) => (
            <LeadListAiRowCard key={row._id} entity={entity} row={row} onChange={ai.updateRow} />
          ))}
          <XStack justifyContent="flex-end" gap="$2">
            <DuncitButton
              label={t('crm.aiFill.back')}
              onPress={ai.back}
              variant="ghost"
              disabled={busy}
              testID="ai-back"
            />
            <DuncitButton
              label={
                ai.busy === 'saving'
                  ? t('shell.common.saving')
                  : t('crm.aiFill.confirm', { vars: { count: ai.rows.length } })
              }
              onPress={() => fireAndForget(save(), logs.mobileApp, SCOPE, 'save')}
              loading={ai.busy === 'saving'}
              disabled={ai.rows.length === 0}
              testID="ai-save"
            />
          </XStack>
        </YStack>
      )}
    </LeadListSheet>
  );
}
