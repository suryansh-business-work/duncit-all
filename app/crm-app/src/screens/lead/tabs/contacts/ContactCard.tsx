import type { ReactNode } from 'react';
import { Linking } from 'react-native';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack, useTheme } from 'tamagui';
import { fireAndForget, logs } from '@duncit/logs';

import { DuncitButton } from '@/components/DuncitButton';
import { SURFACE } from '@/components/surface';
import { ToneChip } from '@/components/ToneChip';
import type { LeadContact } from '@/features/leads/useLead';
import { useTranslation } from '@/hooks/useTranslation';
import { whatsappUrl } from '@/services/dialer';
import { EmailStatusBadge } from './EmailStatusBadge';
import type { EmailStatuses } from './useEmailStatuses';

interface Props {
  contact: LeadContact;
  index: number;
  statuses: EmailStatuses;
  onCall: (contact: LeadContact) => void;
  onEmail: (contact: LeadContact) => void;
}

/** One line of the card: an icon, then what it opens. */
function Line({ icon, children }: Readonly<{ icon: ReactNode; children: ReactNode }>) {
  return (
    <XStack alignItems="center" gap="$2" flexWrap="wrap">
      {icon}
      {children}
    </XStack>
  );
}

/** A tappable number or address, in the accent colour (the portal's link-styled buttons). */
function Tappable({
  label,
  a11y,
  onPress,
  testID,
}: Readonly<{ label: string; a11y: string; onPress: () => void; testID: string }>) {
  return (
    <Text
      color="$accentText"
      role="button"
      aria-label={a11y}
      onPress={onPress}
      paddingVertical="$1"
      hitSlop={8}
      flexShrink={1}
      testID={testID}
    >
      {label}
    </Text>
  );
}

/** The portal's contact card: name and role, Primary on the first, and Call / WhatsApp / Email. */
export function ContactCard({ contact, index, statuses, onCall, onEmail }: Readonly<Props>) {
  const { t } = useTranslation();
  const theme = useTheme();
  const muted = theme.muted?.val;
  const name =
    contact.name ||
    (index === 0
      ? t('crm.leadDetail.primaryContact')
      : t('crm.leadDetail.contactNumber', { vars: { index: index + 1 } }));
  const openWhatsapp = () =>
    fireAndForget(
      Linking.openURL(whatsappUrl(contact.whatsapp_number ?? '')),
      logs.mobileApp,
      'crm-app/ContactCard',
      'whatsapp',
    );
  return (
    <YStack {...SURFACE} gap="$2" testID={`lead-contact-${index}`}>
      <XStack alignItems="center" gap="$2">
        <YStack flex={1}>
          <Text fontWeight="700">{name}</Text>
          {contact.role ? (
            <Text color="$muted" fontSize="$2">
              {contact.role}
            </Text>
          ) : null}
        </YStack>
        {index === 0 ? <ToneChip label={t('crm.components.primary')} tone="info" /> : null}
      </XStack>
      {contact.mobile_number ? (
        <Line
          icon={<MaterialIcons name="phone" size={16} color={muted} accessibilityElementsHidden />}
        >
          <Tappable
            label={contact.mobile_number}
            a11y={t('crm.components.callContact')}
            onPress={() => onCall(contact)}
            testID={`lead-contact-${index}-mobile`}
          />
        </Line>
      ) : null}
      {contact.whatsapp_number ? (
        <Line
          icon={
            <MaterialCommunityIcons
              name="whatsapp"
              size={16}
              color={theme.success?.val}
              accessibilityElementsHidden
            />
          }
        >
          <Tappable
            label={contact.whatsapp_number}
            a11y={t('crm.leadDetail.openWhatsapp')}
            onPress={openWhatsapp}
            testID={`lead-contact-${index}-whatsapp`}
          />
        </Line>
      ) : null}
      {contact.email ? (
        <Line
          icon={<MaterialIcons name="email" size={16} color={muted} accessibilityElementsHidden />}
        >
          <Tappable
            label={contact.email}
            a11y={t('crm.components.emailContact')}
            onPress={() => onEmail(contact)}
            testID={`lead-contact-${index}-email`}
          />
          <EmailStatusBadge email={contact.email} statuses={statuses} />
        </Line>
      ) : null}
      <XStack gap="$2">
        <DuncitButton
          label={contact.mobile_number ? t('crm.leadDetail.call') : t('crm.leadDetail.noNumber')}
          onPress={() => onCall(contact)}
          variant="outline"
          size="sm"
          disabled={!contact.mobile_number}
          icon={<MaterialIcons name="phone" size={16} color={theme.accentText?.val} />}
          testID={`lead-contact-${index}-call`}
        />
        <DuncitButton
          label={contact.email ? t('shell.common.email') : t('crm.leadDetail.noEmail')}
          onPress={() => onEmail(contact)}
          variant="outline"
          size="sm"
          disabled={!contact.email}
          icon={<MaterialIcons name="email" size={16} color={theme.accentText?.val} />}
          testID={`lead-contact-${index}-compose`}
        />
      </XStack>
    </YStack>
  );
}
