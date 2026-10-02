import MediaPickerDialog from '../../../components/MediaPickerDialog';
import EmojiPopover from '../EmojiPopover';
import { useTranslation } from '../../../i18n/useTranslation';

interface ChatRoomOverlaysProps {
  emojiAnchor: HTMLElement | null;
  onCloseEmoji: () => void;
  onInsertEmoji: (emoji: string) => void;
  reactAnchorEl: HTMLElement | null;
  onCloseReact: () => void;
  onReact: (emoji: string) => void;
  picker: boolean;
  onClosePicker: () => void;
  onPicked: (url: string) => void;
}

/** The composer's emoji picker, the reaction picker and the image picker. */
export default function ChatRoomOverlays({
  emojiAnchor,
  onCloseEmoji,
  onInsertEmoji,
  reactAnchorEl,
  onCloseReact,
  onReact,
  picker,
  onClosePicker,
  onPicked,
}: Readonly<ChatRoomOverlaysProps>) {
  const { t } = useTranslation();
  return (
    <>
      <EmojiPopover
        anchorEl={emojiAnchor}
        onClose={onCloseEmoji}
        onSelect={onInsertEmoji}
      />

      <EmojiPopover
        anchorEl={reactAnchorEl}
        onClose={onCloseReact}
        onSelect={onReact}
        fontSize={22}
      />

      <MediaPickerDialog
        open={picker}
        onClose={onClosePicker}
        onPicked={onPicked}
        folder="/chat"
        surface="MWEB"
        title={t('mweb.common.sendImage')}
      />
    </>
  );
}
