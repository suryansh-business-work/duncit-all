import { useState } from 'react';
import { parseApiError } from '@duncit/utils';
import MediaPickerDialog from '../../components/MediaPickerDialog';
import { useTranslation } from '../../i18n/useTranslation';
import EmojiPopover from '../chat-room-page/EmojiPopover';
import MessageComposer from '../chat-room-page/MessageComposer';
import type { VenueChatSend } from './useVenueChatThread';

interface Props {
  send: (input: VenueChatSend) => Promise<void>;
  /** A send failed — already worded for the reader. */
  onError: (message: string) => void;
}

/**
 * The thread's composer: the group chat's own box, emoji list and photo picker
 * — a line of text or one photo, nothing to reply to or mention.
 */
export default function VenueChatComposer({ send, onError }: Readonly<Props>) {
  const { t } = useTranslation();
  const [text, setText] = useState('');
  const [picker, setPicker] = useState(false);
  const [emojiAnchor, setEmojiAnchor] = useState<HTMLElement | null>(null);
  const [sending, setSending] = useState(false);

  const deliver = async (input: VenueChatSend) => {
    setSending(true);
    try {
      await send(input);
      return true;
    } catch (error) {
      onError(parseApiError(error, t('mweb.venueChat.sendFailed')));
      return false;
    } finally {
      setSending(false);
    }
  };

  const sendText = async () => {
    const body = text.trim();
    if (!body || sending) return;
    // The box clears only once the line is in, so a failed send keeps it to retry.
    if (await deliver({ type: 'TEXT', text: body })) setText('');
  };

  return (
    <>
      <MessageComposer
        text={text}
        setText={setText}
        onSend={() => {
          sendText().catch((error: unknown) => onError(parseApiError(error, t('mweb.venueChat.sendFailed'))));
        }}
        onOpenPicker={() => setPicker(true)}
        onOpenEmoji={setEmojiAnchor}
      />
      <EmojiPopover
        anchorEl={emojiAnchor}
        onClose={() => setEmojiAnchor(null)}
        onSelect={(emoji) => {
          setText((current) => current + emoji);
          setEmojiAnchor(null);
        }}
      />
      <MediaPickerDialog
        open={picker}
        onClose={() => setPicker(false)}
        onPicked={(url: string) => {
          setPicker(false);
          deliver({ type: 'IMAGE', image_url: url }).catch((error: unknown) =>
            onError(parseApiError(error, t('mweb.venueChat.sendFailed'))),
          );
        }}
        folder="/chat"
        surface="MWEB"
        title={t('mweb.common.sendImage')}
      />
    </>
  );
}
