import { useEffect, useState } from 'react';
import { ScrollView } from 'react-native';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import { Text, YStack } from 'tamagui';

import { Card } from '@/components/Card';
import { DuncitButton } from '@/components/DuncitButton';
import { formatCallDuration } from '@/features/calls/duration';
import { isLeadKind } from '@/features/leads/leadKinds';
import { useTranslation } from '@/hooks/useTranslation';
import type { AppStackParamList } from '@/navigation/types';
import { usePostCallStore } from '@/stores/postCall.store';
import { syncPostCall, type SaveState } from './postCallSave';

const SAVE_KEYS: Record<SaveState, string> = {
  saving: 'crmApp.postCall.saving',
  saved: 'crmApp.postCall.saved',
  notLogged: 'crmApp.postCall.notLogged',
  retrying: 'crmApp.postCall.retrying',
  off: 'crmApp.postCall.loggingOff',
};

/**
 * After a call with a CRM contact: the call is saved to the lead's
 * communication log (with the phone's recording, transcribed in the CRM), and
 * the person can add a note or a follow-up reminder while it is fresh.
 */
export function PostCallScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp<AppStackParamList>>();
  const pending = usePostCallStore((s) => s.pending);
  const dismiss = usePostCallStore((s) => s.dismiss);
  const [save, setSave] = useState<SaveState>('saving');

  useEffect(() => {
    if (!usePostCallStore.getState().pending) usePostCallStore.getState().collect();
    syncPostCall(usePostCallStore.getState().pending)
      .then(setSave)
      .catch(() => setSave('retrying'));
  }, []);

  const done = () => {
    dismiss();
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.navigate('Tabs', { screen: 'Home' });
  };

  const who = pending?.leadName || pending?.number || t('crmApp.postCall.unknown');
  const seconds = pending ? Math.round((pending.endedAt - pending.startedAt) / 1000) : 0;
  const kind = pending?.entityType;
  const leadId = pending?.leadId;
  const lead =
    isLeadKind(kind) && leadId ? { kind, id: leadId, name: pending?.leadName ?? who } : null;

  const saveText = t(SAVE_KEYS[save]);
  const saveTone = save === 'saved' || save === 'saving' ? '$muted' : '$danger';

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
      <Card title={t('crmApp.postCall.with', { vars: { name: who } })}>
        {pending?.contactName ? <Text color="$muted">{pending.contactName}</Text> : null}
        <Text>
          {pending?.answered
            ? t('crmApp.postCall.lasted', { vars: { duration: formatCallDuration(seconds) } })
            : t('crmApp.postCall.missed')}
        </Text>
        <Text color={saveTone} aria-live="polite" testID="post-call-save">
          {saveText}
        </Text>
      </Card>
      {lead ? (
        <YStack gap="$2">
          <DuncitButton
            label={t('crmApp.lead.addNote')}
            onPress={() => navigation.navigate('AddNote', lead)}
            testID="post-call-note"
            fullWidth
          />
          <DuncitButton
            label={t('crmApp.lead.addReminder')}
            onPress={() =>
              navigation.navigate('AddReminder', {
                ...lead,
                title: t('crmApp.postCall.with', { vars: { name: lead.name } }),
              })
            }
            variant="outline"
            testID="post-call-reminder"
            fullWidth
          />
          <DuncitButton
            label={t('crmApp.dialer.openLead', { vars: { name: lead.name } })}
            onPress={() => navigation.navigate('LeadDetail', { kind: lead.kind, id: lead.id })}
            variant="ghost"
            testID="post-call-open"
            fullWidth
          />
        </YStack>
      ) : null}
      <DuncitButton
        label={t('crmApp.postCall.done')}
        onPress={done}
        variant={lead ? 'ghost' : 'solid'}
        testID="post-call-done"
        fullWidth
      />
    </ScrollView>
  );
}
