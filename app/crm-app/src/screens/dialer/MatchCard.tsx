import { MaterialIcons } from '@expo/vector-icons';
import { Separator, Text, XStack, YStack, useTheme } from 'tamagui';

import { LeadAvatar } from '@/components/LeadAvatar';
import { RADII } from '@/constants/design';
import type { LookupState, PhoneOwner } from '@/features/calls/usePhoneLookup';
import { useTranslation } from '@/hooks/useTranslation';

type IconName = keyof typeof MaterialIcons.glyphMap;

function Stat({ icon, label, value }: Readonly<{ icon: IconName; label: string; value: string }>) {
  const theme = useTheme();
  return (
    <XStack flex={1} alignItems="center" gap="$2">
      <MaterialIcons name={icon} size={22} color={theme.accentText?.val} />
      <YStack flex={1}>
        <Text color="$muted" fontSize="$2">
          {label}
        </Text>
        <Text fontWeight="700" numberOfLines={1}>
          {value}
        </Text>
      </YStack>
    </XStack>
  );
}

function OwnerCard({ owner, onOpen }: Readonly<{ owner: PhoneOwner; onOpen: () => void }>) {
  const { t } = useTranslation();
  const theme = useTheme();
  const dash = t('crmApp.common.dash');
  return (
    <YStack gap="$3" testID="dialer-owner">
      <XStack
        role="button"
        aria-label={t('crmApp.dialer.openLead', { vars: { name: owner.leadName } })}
        onPress={onOpen}
        alignItems="center"
        gap="$3"
      >
        <LeadAvatar name={owner.leadName} size={56} />
        <YStack flex={1} gap="$1">
          <Text fontSize="$7" fontWeight="800" numberOfLines={2}>
            {owner.leadName}
          </Text>
          <XStack alignItems="center" gap="$1.5">
            <MaterialIcons name="sell" size={16} color={theme.muted?.val} />
            <Text color="$muted" numberOfLines={1} flexShrink={1}>
              {[t(`crmApp.kind.${owner.kind}`), owner.contactName].filter(Boolean).join(' · ')}
            </Text>
          </XStack>
          <XStack
            alignSelf="flex-start"
            alignItems="center"
            gap="$1"
            backgroundColor="$successSoft"
            borderRadius={RADII.pill}
            paddingHorizontal="$2"
            paddingVertical="$0.5"
          >
            <MaterialIcons name="check" size={14} color={theme.success?.val} />
            <Text color="$success" fontSize="$2" fontWeight="700">
              {t('crmApp.dialer.crmContact')}
            </Text>
          </XStack>
        </YStack>
        <MaterialIcons name="chevron-right" size={26} color={theme.muted?.val} />
      </XStack>
      <Separator borderColor="$borderColor" />
      <XStack gap="$3">
        <Stat icon="bar-chart" label={t('crmApp.dialer.leadStatus')} value={owner.status || dash} />
        <Stat
          icon="person-outline"
          label={t('crmApp.dialer.assignedTo')}
          value={owner.assignee || dash}
        />
      </XStack>
    </YStack>
  );
}

interface Props {
  lookup: LookupState;
  onOpenLead: (owner: PhoneOwner) => void;
}

/**
 * Who the number belongs to in the CRM, as soon as it is typed: the lead, its
 * kind, a "CRM Contact" mark, its status and assignee — or that the CRM does
 * not know it. Announced politely as it changes.
 */
export function MatchCard({ lookup, onOpenLead }: Readonly<Props>) {
  const { t } = useTranslation();
  if (lookup.status === 'idle') return null;
  return (
    <YStack
      backgroundColor="$surface"
      borderRadius={RADII.lg}
      borderWidth={1}
      borderColor="$borderColor"
      padding="$4"
      aria-live="polite"
    >
      {lookup.status === 'found' ? (
        <OwnerCard owner={lookup.owner} onOpen={() => onOpenLead(lookup.owner)} />
      ) : (
        <Text color="$muted" textAlign="center">
          {t(lookup.status === 'looking' ? 'crmApp.dialer.lookingUp' : 'crmApp.dialer.notInCrm')}
        </Text>
      )}
    </YStack>
  );
}
