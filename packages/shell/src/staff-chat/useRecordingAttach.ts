import { useEffect } from 'react';

interface Options {
  /** The mp4's URL once FFmpeg has produced it, or null. */
  readyUrl: string | null;
  /** The call row the recording belongs to, acked when the call was written. */
  callId: string | null;
  attach: (options: { variables: { callId: string; url: string } }) => Promise<unknown>;
  onAttached: () => void;
}

/**
 * Hang a finished recording on the call it came from.
 *
 * Automatic rather than waiting for somebody to press "send to chat": a
 * recording nobody remembered to post is a recording nobody can find. The call
 * row in the thread then carries it, and the chat message is an extra rather
 * than the only copy.
 */
export function useRecordingAttach({ readyUrl, callId, attach, onAttached }: Options) {
  useEffect(() => {
    if (!readyUrl || !callId) return;
    attach({ variables: { callId, url: readyUrl } })
      .then(onAttached)
      .catch(() => undefined);
  }, [readyUrl, callId, attach, onAttached]);
}
