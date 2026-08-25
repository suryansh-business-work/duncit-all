import { XStack } from 'tamagui';

import { ActionRow, RowIconButton, type ActionIconName } from '@/components/host-manage/ActionRow';
import { useThemeColors } from '@/hooks/useThemeColors';

interface Props {
  testID: string;
  /** MaterialIcons name — a star for the rating link, a camera for the media one. */
  icon: ActionIconName;
  label: string;
  tint: string;
  shareLabel: string;
  copyLabel: string;
  shareTestID: string;
  copyTestID: string;
  onOpen: () => void;
  onShare: () => void;
  onCopy: () => void;
}

/**
 * One of the host's per-pod links, as a sheet line with three ways to use it:
 * tap the row to open the page yourself, or take the link with the two buttons
 * beside it — most hosts want to send it, not fill it in.
 *
 * Both links render through this one row (rule 40), so Share and Copy behave
 * identically wherever they appear. The Tamagui twin of mWeb's
 * PodLinkMenuItem (rule 27).
 */
export function PodLinkRow({
  testID,
  icon,
  label,
  tint,
  shareLabel,
  copyLabel,
  shareTestID,
  copyTestID,
  onOpen,
  onShare,
  onCopy,
}: Readonly<Props>) {
  const { color: ink } = useThemeColors();

  return (
    <ActionRow
      testID={testID}
      icon={icon}
      label={label}
      tint={tint}
      onPress={onOpen}
      trailing={
        <XStack alignItems="center">
          <RowIconButton
            testID={shareTestID}
            icon="ios-share"
            label={shareLabel}
            tint={ink}
            onPress={onShare}
          />
          <RowIconButton
            testID={copyTestID}
            icon="content-copy"
            label={copyLabel}
            tint={ink}
            onPress={onCopy}
          />
        </XStack>
      }
    />
  );
}
