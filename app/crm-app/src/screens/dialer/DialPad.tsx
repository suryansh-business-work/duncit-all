import { useState } from 'react';
import { ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import { Text, XStack, YStack, useTheme } from 'tamagui';
import { fireAndForget, logs } from '@duncit/logs';

import { DuncitButton } from '@/components/DuncitButton';
import { usePhoneLookup, type PhoneOwner } from '@/features/calls/usePhoneLookup';
import { useTranslation } from '@/hooks/useTranslation';
import type { AppStackParamList } from '@/navigation/types';
import { dialNumber } from '@/services/dialer';
import { DialerBottomBar } from './DialerBottomBar';
import { Keypad } from './Keypad';
import { MatchCard } from './MatchCard';
import { NumberField } from './NumberField';

interface Props {
  number: string;
  onNumber: (next: string) => void;
}

/**
 * The Dialpad tab: the number, who it is in the CRM, a recorded call on the
 * CRM call line or the lead itself, the keys, then Add note · Call ·
 * Schedule follow-up. A normal call is a SIM call from this phone.
 */
export function DialPad({ number, onNumber }: Readonly<Props>) {
  const { t } = useTranslation();
  const theme = useTheme();
  const navigation = useNavigation<NavigationProp<AppStackParamList>>();
  const [note, setNote] = useState<string | null>(null);
  const lookup = usePhoneLookup(number);
  const owner = lookup.status === 'found' ? lookup.owner : null;

  const call = async () => {
    const result = await dialNumber(number);
    if (result === 'dialer') setNote(t('crmApp.dialer.openedDialer'));
    else if (result === 'unavailable') setNote(t('crmApp.dialer.unavailable'));
    else setNote(null);
  };
  const openLead = (o: PhoneOwner) =>
    navigation.navigate('LeadDetail', { kind: o.kind, id: o.leadId });
  const leadRef = (o: PhoneOwner) => ({ kind: o.kind, id: o.leadId, name: o.leadName });

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 16, gap: 12 }}>
      <NumberField number={number} onChange={onNumber} />
      <MatchCard lookup={lookup} onOpenLead={openLead} />
      {owner ? (
        <XStack gap="$2">
          <YStack flex={3}>
            <DuncitButton
              label={t('crmApp.call.recordedCall')}
              onPress={() =>
                navigation.navigate('Call', {
                  kind: owner.kind,
                  id: owner.leadId,
                  to: number,
                  leadName: owner.leadName,
                  contactName: owner.contactName || undefined,
                })
              }
              icon={
                <MaterialIcons name="fiber-manual-record" size={18} color={theme.onPrimary?.val} />
              }
              fullWidth
              testID="dialer-recorded-call"
            />
          </YStack>
          <YStack flex={2}>
            <DuncitButton
              label={t('crmApp.dialer.openLeadShort')}
              accessibilityLabel={t('crmApp.dialer.openLead', { vars: { name: owner.leadName } })}
              onPress={() => openLead(owner)}
              variant="outline"
              icon={<MaterialIcons name="open-in-new" size={18} color={theme.accentText?.val} />}
              fullWidth
              testID="dialer-open-lead"
            />
          </YStack>
        </XStack>
      ) : null}
      <YStack flex={1} justifyContent="flex-end" gap="$2">
        <Keypad onKey={(key) => onNumber(number + key)} />
        <DialerBottomBar
          canCall={Boolean(number)}
          hasLead={owner !== null}
          onCall={() => fireAndForget(call(), logs.mobileApp, 'crm-app/DialPad', 'call')}
          onAddNote={() => {
            if (owner) navigation.navigate('AddNote', leadRef(owner));
          }}
          onFollowUp={() => {
            if (!owner) return;
            navigation.navigate('AddReminder', {
              ...leadRef(owner),
              title: t('crmApp.postCall.with', { vars: { name: owner.leadName } }),
            });
          }}
        />
        {note ? (
          <Text color="$muted" textAlign="center" aria-live="polite">
            {note}
          </Text>
        ) : null}
      </YStack>
    </ScrollView>
  );
}
