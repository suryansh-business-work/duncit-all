import { useState } from 'react';
import { Linking } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack, useTheme } from 'tamagui';
import { fireAndForget, logs } from '@duncit/logs';

import type { LeadContact } from '@/features/leads/useLead';
import { dialNumber, whatsappUrl } from '@/services/dialer';
import { useTranslation } from '@/hooks/useTranslation';

interface ActionProps {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  onPress: () => void;
  testID: string;
}

function Action({ icon, label, onPress, testID }: Readonly<ActionProps>) {
  const theme = useTheme();
  return (
    <XStack
      role="button"
      aria-label={label}
      onPress={onPress}
      padding="$2"
      borderRadius="$10"
      backgroundColor="$primarySoft"
      hitSlop={6}
      testID={testID}
    >
      <MaterialIcons name={icon} size={22} color={theme.accentText?.val} />
    </XStack>
  );
}

/** A lead contact with one-tap Call (the CRM dialer: a normal SIM call), WhatsApp and Email. */
export function ContactRow({ contact, index }: Readonly<{ contact: LeadContact; index: number }>) {
  const { t } = useTranslation();
  const [note, setNote] = useState<string | null>(null);
  const name = contact.name || t('crmApp.lead.contact');
  const phone = contact.mobile_number || contact.whatsapp_number || '';
  const whatsapp = contact.whatsapp_number || contact.mobile_number || '';

  const call = async () => {
    const result = await dialNumber(phone);
    if (result === 'dialer') setNote(t('crmApp.dialer.openedDialer'));
    else if (result === 'unavailable') setNote(t('crmApp.dialer.unavailable'));
    else setNote(null);
  };

  return (
    <YStack paddingVertical="$2" gap="$1">
      <XStack alignItems="center" gap="$2">
        <YStack flex={1}>
          <Text fontWeight="600">{name}</Text>
          <Text color="$muted" fontSize="$2">
            {[contact.role, phone, contact.email].filter(Boolean).join(' · ')}
          </Text>
        </YStack>
        {phone ? (
          <Action
            icon="call"
            label={t('crmApp.lead.call', { vars: { name } })}
            onPress={() => fireAndForget(call(), logs.mobileApp, 'crm-app/ContactRow', 'call')}
            testID={`contact-call-${index}`}
          />
        ) : null}
        {whatsapp ? (
          <Action
            icon="chat"
            label={t('crmApp.lead.whatsapp', { vars: { name } })}
            onPress={() =>
              fireAndForget(
                Linking.openURL(whatsappUrl(whatsapp)),
                logs.mobileApp,
                'crm-app/ContactRow',
                'whatsappUrl',
              )
            }
            testID={`contact-whatsapp-${index}`}
          />
        ) : null}
        {contact.email ? (
          <Action
            icon="email"
            label={t('crmApp.lead.email', { vars: { name } })}
            onPress={() =>
              fireAndForget(
                Linking.openURL(`mailto:${contact.email}`),
                logs.mobileApp,
                'crm-app/ContactRow',
                'openURL',
              )
            }
            testID={`contact-email-${index}`}
          />
        ) : null}
      </XStack>
      {note ? (
        <Text color="$muted" fontSize="$2" aria-live="polite">
          {note}
        </Text>
      ) : null}
    </YStack>
  );
}
