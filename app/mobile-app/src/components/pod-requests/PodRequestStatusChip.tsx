import { podRequestStatusLabel, podRequestStatusTone, type PodRequestLike } from '@duncit/utils';

import { ToneChip } from '@/components/club-admin/ToneChip';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  status: PodRequestLike['status'];
  testID?: string;
}

/** A Pod Request's status as the shared helpers word and colour it (mWeb twin). */
export function PodRequestStatusChip({ status, testID }: Readonly<Props>) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const tone = podRequestStatusTone(status);
  const toneColor: Record<typeof tone, string> = {
    warning: colors.warning,
    success: colors.success,
    neutral: colors.muted,
  };
  return (
    <ToneChip label={podRequestStatusLabel(status, t)} color={toneColor[tone]} testID={testID} />
  );
}
