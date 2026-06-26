import { useState } from 'react';
import { useApolloClient, useMutation } from '@apollo/client';
import {
  CLOSE_SUPPORT_CHAT,
  EMAIL_SUPPORT_CHAT_TRANSCRIPT,
  REOPEN_SUPPORT_CHAT,
  SUPPORT_CHAT_TRANSCRIPT,
  type SupportChatTranscript,
  type TranscriptFormat,
} from '../../../graphql/supportChat';
import { saveTranscript } from '../../../lib/downloadTranscript';

/** Bundles the agent's chat-resolution + transcript mutations and a transient
 * snackbar message so the page component stays small. */
export function useChatActions(onChanged: () => void) {
  const client = useApolloClient();
  const [notice, setNotice] = useState('');
  const [resolveChat] = useMutation(CLOSE_SUPPORT_CHAT, { onCompleted: onChanged });
  const [reopenChat] = useMutation(REOPEN_SUPPORT_CHAT, { onCompleted: onChanged });
  const [emailChat] = useMutation(EMAIL_SUPPORT_CHAT_TRANSCRIPT);

  const resolve = (sessionId: string) =>
    resolveChat({ variables: { session_id: sessionId } }).catch((e: Error) => setNotice(e.message));

  const reopen = (sessionId: string) =>
    reopenChat({ variables: { session_id: sessionId, reason: null } }).catch((e: Error) => setNotice(e.message));

  const download = async (sessionId: string, format: TranscriptFormat) => {
    try {
      const { data } = await client.query<{ supportChatTranscript: SupportChatTranscript }>({
        query: SUPPORT_CHAT_TRANSCRIPT,
        variables: { session_id: sessionId, format },
        fetchPolicy: 'no-cache',
      });
      if (data?.supportChatTranscript) saveTranscript(data.supportChatTranscript, format);
    } catch (e) {
      setNotice((e as Error).message);
    }
  };

  const email = async (sessionId: string, address: string) => {
    try {
      await emailChat({ variables: { session_id: sessionId, email: address, format: 'DOCX' } });
      setNotice(`Transcript emailed to ${address}.`);
    } catch (e) {
      setNotice((e as Error).message);
    }
  };

  return { notice, clearNotice: () => setNotice(''), resolve, reopen, download, email };
}
