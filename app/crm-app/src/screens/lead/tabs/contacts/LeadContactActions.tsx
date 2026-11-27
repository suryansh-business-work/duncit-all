import { useState } from 'react';
import { Linking } from 'react-native';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import { YStack } from 'tamagui';
import { fireAndForget, logs } from '@duncit/logs';
import { crmWhatsappDigits } from '@duncit/utils';

import { ActionBar } from '@/components/mobile/ActionBar';
import { QuickAction } from '@/components/mobile/QuickAction';
import type { LeadKind } from '@/features/leads/leadKinds';
import { useTranslation } from '@/hooks/useTranslation';
import type { AppStackParamList } from '@/navigation/types';
import { whatsappUrl } from '@/services/dialer';
import type { CardLead } from '../overview/overviewTypes';
import { EmailComposeModal, type ComposeTarget } from './EmailComposeModal';
import { ResultNote } from './ResultNote';

interface Props {
  kind: LeadKind;
  id: string;
  name: string;
  lead: CardLead;
  /** The lead's values by slug (venue and host leads), for the composer's templates. */
  leadValues?: Readonly<Record<string, string>>;
  onAddNote: () => void;
  onAddReminder: () => void;
}

/**
 * The lead page's bar pinned under the thumb, on every tab: Call (the app's
 * call screen on the CRM call line), WhatsApp, Email (the composer) for the
 * primary contact, then Note (a manual log) and Follow-up (a reminder). A
 * contact action is off when the contact has no such detail.
 */
export function LeadContactActions({
  kind,
  id,
  name,
  lead,
  leadValues,
  onAddNote,
  onAddReminder,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp<AppStackParamList>>();
  const [composing, setComposing] = useState<ComposeTarget | null>(null);
  const [result, setResult] = useState<{ message: string; ok: boolean } | null>(null);
  const primary = lead.contacts[0];
  const mobile = primary?.mobile_number ?? '';
  const email = primary?.email ?? '';
  const waDigits = crmWhatsappDigits(primary?.whatsapp_number, mobile);
  // Each action refuses on its own without its detail, not only through the disabled button.
  const call = () => {
    if (mobile)
      navigation.navigate('Call', { kind, id, to: mobile, leadName: name, contactName: name });
  };
  const openWhatsapp = () => {
    if (!waDigits) return;
    fireAndForget(
      Linking.openURL(whatsappUrl(waDigits)),
      logs.mobileApp,
      'crm-app/LeadContactActions',
      'whatsapp',
    );
  };
  const compose = () => {
    if (!email) return;
    setResult(null);
    setComposing({ displayName: name, email });
  };

  return (
    <YStack>
      {result ? (
        <YStack paddingHorizontal="$4" paddingBottom="$2">
          <ResultNote result={result} />
        </YStack>
      ) : null}
      <ActionBar testID="lead-contact-actions">
        <QuickAction
          icon={{ name: 'phone' }}
          label={t('crm.leadDetail.call')}
          accessibilityLabel={
            mobile ? t('crm.leadDetail.callNumber', { vars: { number: mobile } }) : undefined
          }
          onPress={call}
          disabled={!mobile}
          testID="lead-action-call"
        />
        <QuickAction
          icon={{ set: 'community', name: 'whatsapp' }}
          label={t('crm.leadDetail.whatsapp')}
          onPress={openWhatsapp}
          disabled={!waDigits}
          testID="lead-action-whatsapp"
        />
        <QuickAction
          icon={{ name: 'email' }}
          label={t('shell.common.email')}
          accessibilityLabel={
            email ? t('crm.leadDetail.emailAddress', { vars: { email } }) : undefined
          }
          onPress={compose}
          disabled={!email}
          testID="lead-action-email"
        />
        <QuickAction
          icon={{ name: 'note-add' }}
          label={t('crmApp.mobile.note')}
          onPress={onAddNote}
          testID="lead-add-note"
        />
        <QuickAction
          icon={{ name: 'alarm-add' }}
          label={t('crmApp.mobile.followUp')}
          onPress={onAddReminder}
          testID="lead-add-reminder"
        />
      </ActionBar>
      <EmailComposeModal
        kind={kind}
        id={id}
        target={composing}
        leadValues={leadValues}
        onClose={() => setComposing(null)}
        onResult={(message, ok) => setResult({ message, ok })}
      />
    </YStack>
  );
}
