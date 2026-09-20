import { Avatar, AvatarImage, Text, XStack, YStack } from 'tamagui';

import type { ClubPodHostRow } from '@/hooks/useClubPodDetail';
import { useTranslation } from '@/hooks/useTranslation';
import type { Translate } from '@/i18n/fallback';
import { ToneChip } from '../ToneChip';
import { useToneColors } from '../tone';
import { PodDetailSection } from './PodDetailSection';

/** Email · phone · host number — whichever the profile actually carries. */
const contactLine = (host: ClubPodHostRow, t: Translate): string =>
  [host.email, host.phone, host.hostNo].filter(Boolean).join(' · ') ||
  t('podDetailsPanel.podHostsCard.noContact');

interface RowProps {
  host: ClubPodHostRow;
  /** The first host on the pod — the one the club deals with. */
  isPrimary: boolean;
  /** Resolved accent for the Primary chip, computed once in the parent. */
  primaryColor: string;
  /** Resolved accent for the host-profile status chip. */
  statusColor: string;
}

/** One host line: contact from the roster plus the approved host profile. */
function HostLine({ host, isPrimary, primaryColor, statusColor }: Readonly<RowProps>) {
  const { t } = useTranslation();
  const name = host.name || t('mweb.studioPods.hostsNone');

  return (
    <XStack alignItems="center" gap={12} testID={`club-pod-detail-host-${host.userId}`}>
      <Avatar circular size={36}>
        <AvatarImage accessibilityLabel={name} src={host.photo ?? undefined} />
      </Avatar>
      <YStack flex={1} gap={4}>
        <XStack alignItems="center" gap={8} flexWrap="wrap">
          <Text fontSize={14} fontWeight="600" color="$color" numberOfLines={1}>
            {name}
          </Text>
          {isPrimary ? (
            <ToneChip
              testID={`club-pod-detail-host-${host.userId}-primary`}
              label={t('podDetailsPanel.podHostsCard.primary')}
              color={primaryColor}
            />
          ) : null}
          {host.status ? (
            <ToneChip
              testID={`club-pod-detail-host-${host.userId}-status`}
              label={host.status}
              color={statusColor}
            />
          ) : null}
        </XStack>
        <Text fontSize={12} color="$muted" numberOfLines={2}>
          {contactLine(host, t)}
        </Text>
      </YStack>
    </XStack>
  );
}

/**
 * Host details — every host on the pod with contact info and host profile.
 *
 * The Tamagui twin of `@duncit/pod-details`' `PodHostsCard` (rule 27). The
 * host profile behind each name is read pod-scoped, so a club admin sees the
 * host running THEIR pod rather than any host on the platform.
 */
export function PodDetailHosts({ hosts }: Readonly<{ hosts: readonly ClubPodHostRow[] }>) {
  const { t } = useTranslation();
  const tones = useToneColors();
  const empty = hosts.length === 0 ? t('podDetailsPanel.podHostsCard.noHosts') : null;

  return (
    <PodDetailSection
      title={t('podDetailsPanel.podHostsCard.hosts')}
      testID="club-pod-detail-hosts"
      badge={hosts.length}
      emptyText={empty}
    >
      {hosts.map((host, index) => (
        <HostLine
          key={host.userId}
          host={host}
          isPrimary={index === 0}
          primaryColor={tones.info}
          statusColor={tones.success}
        />
      ))}
    </PodDetailSection>
  );
}
