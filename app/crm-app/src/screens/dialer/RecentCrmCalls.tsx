import { useCallback, useEffect, useState } from 'react';
import { FlatList } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack, useTheme } from 'tamagui';
import { CALL_TYPE, CrmTelephony, type RecentCrmCall } from 'crm-telephony';

import { DuncitButton } from '@/components/DuncitButton';
import { LeadAvatar } from '@/components/LeadAvatar';
import { StateView } from '@/components/StateView';
import { RADII } from '@/constants/design';
import { formatCallDuration } from '@/features/calls/duration';
import { displayDateTime } from '@/features/reminders/reminderTime';
import { useTranslation } from '@/hooks/useTranslation';
import { readPermissions, requestPermission } from '@/services/permissions';

const LIMIT = 100;

type IconName = keyof typeof MaterialIcons.glyphMap;

/** How each call-log type is drawn: its icon, whether it reads as missed, and its label. */
export function callKind(type: number): { icon: IconName; missed: boolean; label: string } {
  if (type === CALL_TYPE.OUTGOING)
    return { icon: 'call-made', missed: false, label: 'crmApp.dialer.outgoing' };
  if (type === CALL_TYPE.MISSED || type === CALL_TYPE.REJECTED)
    return { icon: 'call-missed', missed: true, label: 'crmApp.dialer.missed' };
  return { icon: 'call-received', missed: false, label: 'crmApp.dialer.incoming' };
}

function Row({ call, onPick }: Readonly<{ call: RecentCrmCall; onPick: (n: string) => void }>) {
  const { t } = useTranslation();
  const theme = useTheme();
  const kind = callKind(call.type);
  const when = displayDateTime(new Date(call.date).toISOString());
  const duration = call.durationSeconds > 0 ? formatCallDuration(call.durationSeconds) : '';
  return (
    <XStack
      role="button"
      aria-label={[call.leadName, t(kind.label), when, duration].filter(Boolean).join(', ')}
      onPress={() => onPick(call.number)}
      alignItems="center"
      gap="$3"
      padding="$3"
      backgroundColor="$surface"
      borderRadius={RADII.lg}
      borderWidth={1}
      borderColor="$borderColor"
      testID={`recent-${call.id}`}
    >
      <LeadAvatar name={call.leadName} size={44} />
      <YStack flex={1}>
        <Text fontWeight="700" numberOfLines={1} color={kind.missed ? '$danger' : '$color'}>
          {call.leadName}
        </Text>
        <XStack alignItems="center" gap="$1">
          <MaterialIcons
            name={kind.icon}
            size={14}
            color={kind.missed ? theme.danger?.val : theme.muted?.val}
          />
          <Text color="$muted" fontSize="$2" numberOfLines={1} flexShrink={1}>
            {[t(`crmApp.kind.${call.entityType}`), when, duration].filter(Boolean).join(' · ')}
          </Text>
        </XStack>
      </YStack>
      <MaterialIcons name="call" size={22} color={theme.accentText?.val} />
    </XStack>
  );
}

/**
 * The Call logs tab: this phone's recent calls with CRM contacts only. The
 * matching runs on the phone (CrmTelephony.recentCrmCalls), so personal calls
 * never reach this screen. Tapping a call puts its number on the dial pad.
 */
export function RecentCrmCalls({ onPick }: Readonly<{ onPick: (number: string) => void }>) {
  const { t } = useTranslation();
  const [calls, setCalls] = useState<RecentCrmCall[] | null>(null);
  const [allowed, setAllowed] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const permissions = await readPermissions();
      setAllowed(permissions.phone);
      setCalls(permissions.phone ? ((await CrmTelephony?.recentCrmCalls(LIMIT)) ?? []) : []);
    } catch {
      setError(t('crmApp.common.loadFailed'));
    }
  }, [t]);

  useEffect(() => {
    load().catch(() => setError(t('crmApp.common.loadFailed')));
  }, [load, t]);

  if (!allowed)
    return (
      <YStack padding="$4" gap="$3" alignItems="center">
        <Text color="$muted" textAlign="center">
          {t('crmApp.dialer.recentsNeedPermission')}
        </Text>
        <DuncitButton
          label={t('crmApp.settings.allow')}
          onPress={() => {
            requestPermission('phone')
              .then(load)
              .catch(() => setError(t('crmApp.common.loadFailed')));
          }}
          testID="recents-allow"
        />
      </YStack>
    );
  return (
    <FlatList
      data={calls ?? []}
      keyExtractor={(c) => c.id}
      contentContainerStyle={{ padding: 16, gap: 8, flexGrow: 1 }}
      renderItem={({ item }) => <Row call={item} onPick={onPick} />}
      ListEmptyComponent={
        <StateView
          loading={calls === null && !error}
          error={error}
          empty={t('crmApp.dialer.recentsEmpty')}
          onRetry={load}
        />
      }
    />
  );
}
