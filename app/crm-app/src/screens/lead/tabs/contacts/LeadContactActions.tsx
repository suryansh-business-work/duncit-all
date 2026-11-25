import { useState } from 'react';
import { Linking } from 'react-native';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { XStack, YStack, useTheme } from 'tamagui';
import { fireAndForget, logs } from '@duncit/logs';
import { crmWhatsappDigits } from '@duncit/utils';

import { DuncitButton } from '@/components/DuncitButton';
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
}

/**
 * The quick actions under the lead's name, for its primary contact: Call
 * (the app's call screen on the CRM call line), WhatsApp and Email (the
 * composer). Each is off when the contact has no such detail.
 */
export function LeadContactActions({ kind, id, name, lead, leadValues }: Readonly<Props>) {
  const { t } = useTranslation();
  const theme = useTheme();
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
  const icon = (glyph: 'phone' | 'email') => (
    <MaterialIcons name={glyph} size={16} color={theme.accentText?.val} />
  );

  return (
    <YStack gap="$2">
      <XStack gap="$2" flexWrap="wrap" testID="lead-contact-actions">
        <DuncitButton
          label={t('crm.leadDetail.call')}
          accessibilityLabel={
            mobile ? t('crm.leadDetail.callNumber', { vars: { number: mobile } }) : undefined
          }
          onPress={call}
          variant="outline"
          size="sm"
          disabled={!mobile}
          icon={icon('phone')}
          testID="lead-action-call"
        />
        <DuncitButton
          label={t('crm.leadDetail.whatsapp')}
          onPress={openWhatsapp}
          variant="outline"
          size="sm"
          disabled={!waDigits}
          icon={<MaterialCommunityIcons name="whatsapp" size={16} color={theme.accentText?.val} />}
          testID="lead-action-whatsapp"
        />
        <DuncitButton
          label={t('shell.common.email')}
          accessibilityLabel={
            email ? t('crm.leadDetail.emailAddress', { vars: { email } }) : undefined
          }
          onPress={compose}
          variant="outline"
          size="sm"
          disabled={!email}
          icon={icon('email')}
          testID="lead-action-email"
        />
      </XStack>
      <ResultNote result={result} />
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
