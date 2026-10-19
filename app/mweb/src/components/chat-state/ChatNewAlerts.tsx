import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { chatNewToastLine, chatRoomFromPath, chatRoomPath, isViewingRoom } from '@duncit/utils';
import { notify } from '../notify';
import { useTranslation } from '../../i18n/useTranslation';
import { onChatNew, pingForMessage } from './chatAlerts';

/** How long the "new message" toast stays up. */
const TOAST_MS = 5000;

/**
 * A message in a room the reader is not looking at: one ping per burst and a
 * toast with the room and the line, whose Open button goes to the room. The
 * server already left out muted rooms (unless they were mentioned) and the
 * room the reader has open; the path check covers a frame racing a navigation.
 */
export default function ChatNewAlerts() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const path = useRef(pathname);
  path.current = pathname;

  useEffect(
    () =>
      onChatNew((frame) => {
        if (isViewingRoom(chatRoomFromPath(path.current), frame)) return;
        pingForMessage(frame.message_id);
        notify(`${t('mweb.chatRoom.alert.newMessageIn', { vars: { title: frame.title } })} · ${chatNewToastLine(frame, t)}`, 'info', TOAST_MS, {
          label: t('mweb.chatRoom.alert.open'),
          onClick: () => navigate(chatRoomPath(frame.room_kind, frame.room_id)),
        });
      }),
    [navigate, t]
  );

  return null;
}
