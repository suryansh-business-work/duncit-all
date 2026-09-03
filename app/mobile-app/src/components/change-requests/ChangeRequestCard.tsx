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
import { ToneChip } from '@/components/club-admin/ToneChip';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';

/** One `Label / Value` fact on a card. Hoisted, never redefined per render. */
function Fact({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <YStack flexBasis="45%" flexGrow={1} gap={1}>
      <Text fontSize={10.5} fontWeight="700" color="$muted" numberOfLines={1}>
        {label}
      </Text>
      <Text fontSize={13} fontWeight="600" color="$color" numberOfLines={1}>
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
    <YStack
      testID={testID}
      gap={8}
      padding={12}
      borderRadius={12}
      borderWidth={1}
      borderColor="$borderColor"
      backgroundColor="$surface"
    >
      <XStack alignItems="center" gap={8}>
        <Text flex={1} fontSize={14.5} fontWeight="600" color="$color" numberOfLines={1}>
          {row.pod.pod_title}
        </Text>
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

      <Text fontSize={12} color="$muted" numberOfLines={1}>
        {when}
      </Text>

      <XStack gap={10} flexWrap="wrap">
        <Fact label={t('changeRequest.requestNo')} value={row.change_request_no} />
        <Fact label={t('changeRequest.filedOn')} value={filedOn} />
        <Fact label={t('changeRequest.attendees')} value={String(row.pod.attendee_count)} />
        {row.health_penalty > 0 ? (
          <Fact label={t('changeRequest.pointsDeducted')} value={`-${row.health_penalty}`} />
        ) : null}
      </XStack>

      <YStack gap={1}>
        <Text fontSize={10.5} fontWeight="700" color="$muted">
          {t('changeRequest.reason')}
        </Text>
        <Text fontSize={13} color="$color">
          {row.reason || t('changeRequest.noReason')}
        </Text>
      </YStack>

      {onApprove || onPass || showWithdraw ? (
        <XStack gap={8} justifyContent="flex-end">
          {showWithdraw ? (
            <DuncitButton
              testID={`${testID}-withdraw`}
              label={t('changeRequest.withdraw')}
              onPress={onWithdraw ?? (() => undefined)}
              variant="ghost"
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
    </YStack>
  );
}
