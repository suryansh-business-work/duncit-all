import { Text, XStack, YStack } from 'tamagui';
import {
  canWithdrawChangeRequest,
  changeRequestRoleKey,
  changeRequestStatusKey,
  changeRequestTone,
  type PodChangeRow,
  type PodChangeTone,
} from '@duncit/utils';

import { DuncitButton } from '@/components/DuncitButton';
import { SurfaceCard } from '@/components/SurfaceCard';
import { ToneChip } from '@/components/club-admin/ToneChip';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';

/** One `Label / Value` fact on a card. Hoisted, never redefined per render. */
function Fact({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <YStack flexBasis="45%" flexGrow={1} gap={2}>
      <Text fontSize={12} fontWeight="500" color="$muted" numberOfLines={1}>
        {label}
      </Text>
      <Text fontSize={14} fontWeight="600" color="$color" numberOfLines={1}>
        {value}
      </Text>
    </YStack>
  );
}

interface Props {
  row: PodChangeRow;
  /** Already formatted in the admin's date/time settings by the section. */
  when: string;
  filedOn: string;
  testID: string;
  busy: boolean;
  /** Set on the "waiting on you" list. */
  onApprove?: () => void;
  onPass?: () => void;
  /** Set on the requester's own list, while it is still theirs to pull. */
  onWithdraw?: () => void;
}

/**
 * One change request — the Tamagui twin of `ChangeRequestCard` in
 * `@duncit/pod-change-requests` (rule 27: same facts, same order, same words).
 *
 * The chip's tone is computed ONCE here and handed to `ToneChip`, rather than
 * re-derived inside a conditionally-rendered child: a value that only exists on
 * one render path is a branch a single-sided test leaves uncovered.
 */
export function ChangeRequestCard({
  row,
  when,
  filedOn,
  testID,
  busy,
  onApprove,
  onPass,
  onWithdraw,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const colors = useThemeColors();

  const toneName: PodChangeTone = changeRequestTone(row);
  const toneColor =
    {
      warning: colors.warning,
      info: colors.primary,
      success: colors.success,
      error: colors.danger,
      default: colors.muted,
    }[toneName] ?? colors.muted;

  const showWithdraw = Boolean(onWithdraw) && canWithdrawChangeRequest(row);

  return (
    // A hairline even in light mode, like mWeb's outlined card: a studio draws
    // this board inside its own card, where a borderless one would disappear.
    <SurfaceCard testID={testID} gap={12} borderColor="$borderColor">
      <XStack alignItems="flex-start" gap={8}>
        <YStack flex={1} gap={2}>
          <Text fontSize={16} fontWeight="600" color="$color" numberOfLines={1}>
            {row.pod.pod_title}
          </Text>
          <Text fontSize={12.5} color="$muted" numberOfLines={1}>
            {when}
          </Text>
        </YStack>
        <ToneChip
          testID={`${testID}-role`}
          label={t(changeRequestRoleKey(row.role))}
          color={colors.muted}
        />
        <ToneChip
          testID={`${testID}-state`}
          label={t(changeRequestStatusKey(row))}
          color={toneColor}
        />
      </XStack>

      <YStack height={1} backgroundColor="$borderColor" />

      <XStack gap={12} flexWrap="wrap">
        <Fact label={t('changeRequest.requestNo')} value={row.change_request_no} />
        <Fact label={t('changeRequest.filedOn')} value={filedOn} />
        <Fact label={t('changeRequest.attendees')} value={String(row.pod.attendee_count)} />
        {row.health_penalty > 0 ? (
          <Fact label={t('changeRequest.pointsDeducted')} value={`-${row.health_penalty}`} />
        ) : null}
      </XStack>

      <YStack gap={2}>
        <Text fontSize={12} fontWeight="500" color="$muted">
          {t('changeRequest.reason')}
        </Text>
        <Text fontSize={14} color="$color">
          {row.reason || t('changeRequest.noReason')}
        </Text>
      </YStack>

      {onApprove || onPass || showWithdraw ? (
        <XStack gap={8} justifyContent="flex-end" flexWrap="wrap">
          {showWithdraw ? (
            <DuncitButton
              testID={`${testID}-withdraw`}
              label={t('changeRequest.withdraw')}
              onPress={onWithdraw ?? (() => undefined)}
              variant="outline"
              size="sm"
              disabled={busy}
            />
          ) : null}
          {onPass ? (
            <DuncitButton
              testID={`${testID}-pass`}
              label={t('changeRequest.pass')}
              onPress={onPass}
              variant="outline"
              tone="danger"
              size="sm"
              disabled={busy}
            />
          ) : null}
          {onApprove ? (
            <DuncitButton
              testID={`${testID}-approve`}
              label={t('changeRequest.approve')}
              onPress={onApprove}
              tone="success"
              size="sm"
              disabled={busy}
            />
          ) : null}
        </XStack>
      ) : null}
    </SurfaceCard>
  );
}
