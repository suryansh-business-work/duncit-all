import { useEffect, useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import {
  useNavigation,
  useRoute,
  type NavigationProp,
  type RouteProp,
} from '@react-navigation/native';
import { Input, Text, XStack, YStack, useTheme } from 'tamagui';
import { fireAndForget, logs } from '@duncit/logs';

import { DuncitButton } from '@/components/DuncitButton';
import { usePhoneLookup } from '@/features/calls/usePhoneLookup';
import { dialNumber, dialable } from '@/services/dialer';
import { useTranslation } from '@/hooks/useTranslation';
import type { AppStackParamList, TabParamList } from '@/navigation/types';
import { Keypad } from './Keypad';

/**
 * The Duncit CRM dialer: type or paste a number, see at once whether it is a
 * CRM contact, and place a normal SIM call. Opened from the tab, the widget,
 * the home-screen Dialer icon, the app shortcut, or any tapped phone number.
 */
export function DialerScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const navigation = useNavigation<NavigationProp<AppStackParamList>>();
  const { params } = useRoute<RouteProp<TabParamList, 'Dialer'>>();
  const [number, setNumber] = useState(params?.number ?? '');
  const [note, setNote] = useState<string | null>(null);
  const lookup = usePhoneLookup(number);

  useEffect(() => {
    if (params?.number) setNumber(dialable(params.number));
  }, [params?.number]);

  const call = async () => {
    const result = await dialNumber(number);
    if (result === 'dialer') setNote(t('crmApp.dialer.openedDialer'));
    else if (result === 'unavailable') setNote(t('crmApp.dialer.unavailable'));
    else setNote(null);
  };

  return (
    <YStack
      flex={1}
      backgroundColor="$background"
      padding="$4"
      gap="$4"
      justifyContent="space-between"
    >
      <YStack gap="$2" alignItems="center">
        <XStack alignItems="center" gap="$2" width="100%">
          <Input
            flex={1}
            value={number}
            onChangeText={(text) => setNumber(dialable(text))}
            placeholder={t('crmApp.dialer.placeholder')}
            aria-label={t('crmApp.dialer.placeholder')}
            placeholderTextColor="$muted"
            keyboardType="phone-pad"
            fontSize="$8"
            textAlign="center"
            borderWidth={0}
            backgroundColor="transparent"
            showSoftInputOnFocus={false}
            testID="dialer-number"
          />
          {number ? (
            <XStack
              role="button"
              aria-label={t('crmApp.dialer.backspace')}
              onPress={() => setNumber((n) => n.slice(0, -1))}
              padding="$2"
              testID="dialer-backspace"
            >
              <MaterialIcons name="backspace" size={26} color={theme.muted?.val} />
            </XStack>
          ) : null}
        </XStack>
        <YStack minHeight={48} alignItems="center" aria-live="polite">
          {lookup.status === 'looking' ? (
            <Text color="$muted">{t('crmApp.dialer.lookingUp')}</Text>
          ) : null}
          {lookup.status === 'none' ? (
            <Text color="$muted">{t('crmApp.dialer.notInCrm')}</Text>
          ) : null}
          {lookup.status === 'found' ? (
            <YStack alignItems="center" testID="dialer-owner">
              <Text fontWeight="700" fontSize="$6">
                {lookup.owner.leadName}
              </Text>
              <Text color="$muted">
                {[lookup.owner.contactName, t(`crmApp.kind.${lookup.owner.kind}`)]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
              <DuncitButton
                label={t('crmApp.dialer.openLead', { vars: { name: lookup.owner.leadName } })}
                onPress={() =>
                  navigation.navigate('LeadDetail', {
                    kind: lookup.owner.kind,
                    id: lookup.owner.leadId,
                  })
                }
                variant="ghost"
                size="sm"
                testID="dialer-open-lead"
              />
            </YStack>
          ) : null}
        </YStack>
      </YStack>
      <Keypad onKey={(key) => setNumber((n) => n + key)} />
      <YStack gap="$2" alignItems="center">
        <DuncitButton
          label={t('crmApp.dialer.call')}
          onPress={() => fireAndForget(call(), logs.mobileApp, 'crm-app/DialerScreen', 'call')}
          disabled={!number}
          tone="success"
          icon={<MaterialIcons name="call" size={22} color={theme.onSuccess?.val} />}
          fullWidth
          testID="dialer-call"
        />
        {note ? (
          <Text color="$muted" textAlign="center">
            {note}
          </Text>
        ) : null}
      </YStack>
    </YStack>
  );
}
