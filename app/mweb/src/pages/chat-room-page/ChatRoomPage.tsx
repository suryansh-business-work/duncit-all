import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@apollo/client';
import {
  Alert,
  Box,
  CircularProgress,
  Stack,
} from '@mui/material';
import MediaPickerDialog from '../../components/MediaPickerDialog';
import { isPodActive } from '../../utils/podStatus';
import { podUrl } from '../../utils/seoUrls';
import ChatClosedNotice from './ChatClosedNotice';
import ChatParticipants from './ChatParticipants';
import ChatRoomHeader from './ChatRoomHeader';
import ChatRoomNotice from './ChatRoomNotice';
import EmojiPopover from './EmojiPopover';
import MessageBubble from './MessageBubble';
import MessageComposer from './MessageComposer';
import { CHAT_PARTICIPANTS, POD_MESSAGES, REACT_MSG, SEND_MSG } from './queries';
import { usePodSocket } from './usePodSocket';

export default function ChatRoomPage() {
  const { id: podId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, loading, refetch } = useQuery(POD_MESSAGES, {
    variables: { pod_id: podId, limit: 80 },
    fetchPolicy: 'cache-and-network',
  });
  const { data: peopleData } = useQuery(CHAT_PARTICIPANTS, {
    variables: { pod_id: podId },
    fetchPolicy: 'cache-and-network',
  });
  const [text, setText] = useState('');
  const [picker, setPicker] = useState(false);
  const [emojiAnchor, setEmojiAnchor] = useState<HTMLElement | null>(null);
  const [reactAnchor, setReactAnchor] = useState<{ el: HTMLElement; id: string } | null>(null);
  const [send] = useMutation(SEND_MSG);
  const [react] = useMutation(REACT_MSG);
  const [live, setLive] = useState<any[]>([]);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  const myId = data?.me?.user_id;
  const pod = data?.pod;
  const podEnded = pod ? !isPodActive(pod.pod_date_time, pod.pod_end_date_time) : false;
  const people = peopleData?.chatParticipants;

  const openPod = () => {
    if (pod?.club_slug && pod?.pod_id) {
      navigate(podUrl(pod.club_slug, pod.pod_id));
    } else {
      setError('Pod details are unavailable for this chat.');
    }
  };
  const messages = useMemo(() => {
    const initial = data?.podMessages ?? [];
    const merged = [...initial];
    const ids = new Set(initial.map((m: any) => m.id));
    for (const m of live) if (!ids.has(m.id)) merged.push(m);
    return merged;
  }, [data, live]);

  const onMessage = useCallback((msg: any) => setLive((p) => [...p, msg]), []);
  const onReactionUpdate = useCallback(
    (msg: any) =>
      setLive((p) => p.map((m) => (m.id === msg.id ? { ...m, reactions: msg.reactions } : m))),
    []
  );

  usePodSocket({
    podId,
    refetch,
    onMessage,
    onReactionUpdate,
    onError: setError,
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages.length]);

  const submit = async (overrideImage?: string) => {
    const t = text.trim();
    if (!t && !overrideImage) return;
    try {
      await send({
        variables: {
          pod_id: podId,
          type: overrideImage ? 'IMAGE' : 'TEXT',
          text: overrideImage ? '' : t,
          image_url: overrideImage || null,
        },
      });
      setText('');
    } catch (e: any) {
      setError(e.message);
    }
  };

  const insertEmoji = (e: string) => {
    setText((p) => p + e);
    setEmojiAnchor(null);
  };

  const onReact = async (emoji: string) => {
    if (!reactAnchor) return;
    try {
      await react({ variables: { message_id: reactAnchor.id, emoji } });
    } catch (err: any) {
      setError(err.message);
    }
    setReactAnchor(null);
  };

  if (loading && !data)
    return (
      <Stack alignItems="center" sx={{ p: 6 }}>
        <CircularProgress />
      </Stack>
    );

  return (
    <Stack
      sx={{
        height: '100%',
        minHeight: 0,
        mx: { xs: -1.25, sm: -2 },
      }}
    >
      <ChatRoomHeader
        title={data?.pod?.pod_title}
        messageCount={messages.length}
        onBack={() => navigate('/chats')}
        onOpenPod={openPod}
      />

      {people && (
        <ChatParticipants
          hosts={people.hosts}
          participants={people.participants}
          count={people.participant_count}
          onOpenProfile={(userId) => navigate(`/u/${userId}`)}
        />
      )}

      {error && (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Box
        ref={scrollRef}
        sx={{ flex: 1, overflowY: 'auto', px: { xs: 1.25, sm: 2 }, py: 1.25 }}
      >
        <ChatRoomNotice ended={podEnded} />
        {messages.map((m: any) => (
          <MessageBubble
            key={m.id}
            message={m}
            mine={String(m.user_id) === String(myId)}
            onOpenReact={(el, id) => setReactAnchor({ el, id })}
          />
        ))}
      </Box>

      {podEnded ? (
        <ChatClosedNotice />
      ) : (
        <MessageComposer
          text={text}
          setText={setText}
          onSend={() => submit()}
          onOpenPicker={() => setPicker(true)}
          onOpenEmoji={setEmojiAnchor}
        />
      )}

      <EmojiPopover
        anchorEl={emojiAnchor}
        onClose={() => setEmojiAnchor(null)}
        onSelect={insertEmoji}
      />

      <EmojiPopover
        anchorEl={reactAnchor?.el ?? null}
        onClose={() => setReactAnchor(null)}
        onSelect={onReact}
        fontSize={22}
      />

      <MediaPickerDialog
        open={picker}
        onClose={() => setPicker(false)}
        onPicked={(url) => {
          setPicker(false);
          submit(url);
        }}
        folder="/chat"
        title="Send image"
      />
    </Stack>
  );
}
