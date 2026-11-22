import { useCallback, useEffect, useRef, useState } from 'react';
import { ASK_DUNCIT_SPEAK_PATH, ASK_DUNCIT_TRANSCRIBE_PATH, markdownToPlainText } from '@duncit/utils';
import { logs } from '@duncit/logs';
import { urlConfigs } from '../../config/url-configs';

/**
 * Voice for Ask Duncit on mWeb: record with the browser's MediaRecorder and
 * let the server transcribe (Hindi and Hinglish included); read answers aloud
 * with the server's speech. The native app calls the same two endpoints, so
 * both platforms hear and speak identically.
 */

export type VoiceError = 'PERMISSION' | 'UNSUPPORTED' | 'FAILED';

const authHeaders = (): Record<string, string> => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const roleQuery = (role: string) => `?role=${encodeURIComponent(role)}`;

export function useVoice(role: string) {
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const audio = useRef<HTMLAudioElement | null>(null);

  useEffect(
    () => () => {
      recorder.current?.stream.getTracks().forEach((track) => track.stop());
      audio.current?.pause();
    },
    []
  );

  const start = useCallback(async (): Promise<VoiceError | null> => {
    if (typeof MediaRecorder === 'undefined' || !navigator.mediaDevices?.getUserMedia) return 'UNSUPPORTED';
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunks.current = [];
      rec.ondataavailable = (e) => {
        if (e.data.size) chunks.current.push(e.data);
      };
      rec.start();
      recorder.current = rec;
      setRecording(true);
      return null;
    } catch (error) {
      logs.mWeb.warn('ask-duncit', 'micPermission', { error });
      return 'PERMISSION';
    }
  }, []);

  /** Stop recording and return the transcript (or null when nothing usable came back). */
  const stop = useCallback(async (): Promise<string | null> => {
    const rec = recorder.current;
    if (!rec) return null;
    const stopped = new Promise<void>((resolve) => {
      rec.onstop = () => resolve();
    });
    rec.stop();
    await stopped;
    rec.stream.getTracks().forEach((track) => track.stop());
    recorder.current = null;
    setRecording(false);
    const blob = new Blob(chunks.current, { type: rec.mimeType || 'audio/webm' });
    if (!blob.size) return null;
    setTranscribing(true);
    try {
      const res = await fetch(`${urlConfigs.apiBaseUrl}${ASK_DUNCIT_TRANSCRIBE_PATH}${roleQuery(role)}`, {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': blob.type.split(';')[0] },
        body: blob,
      });
      if (!res.ok) throw new Error(`transcribe ${res.status}`);
      const body = (await res.json()) as { text?: string };
      return body.text?.trim() || null;
    } catch (error) {
      logs.mWeb.warn('ask-duncit', 'transcribe', { error });
      return null;
    } finally {
      setTranscribing(false);
    }
  }, [role]);

  const stopSpeaking = useCallback(() => {
    audio.current?.pause();
    audio.current = null;
    setSpeakingId(null);
  }, []);

  /** Read one answer aloud; tapping the same answer again stops it. */
  const speak = useCallback(
    async (messageId: string, markdown: string): Promise<boolean> => {
      if (speakingId === messageId) {
        stopSpeaking();
        return true;
      }
      stopSpeaking();
      setSpeakingId(messageId);
      try {
        const res = await fetch(`${urlConfigs.apiBaseUrl}${ASK_DUNCIT_SPEAK_PATH}${roleQuery(role)}`, {
          method: 'POST',
          headers: { ...authHeaders(), 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: markdownToPlainText(markdown) }),
        });
        if (!res.ok) throw new Error(`speak ${res.status}`);
        const url = URL.createObjectURL(await res.blob());
        const player = new Audio(url);
        audio.current = player;
        player.onended = () => {
          URL.revokeObjectURL(url);
          setSpeakingId(null);
        };
        await player.play();
        return true;
      } catch (error) {
        logs.mWeb.warn('ask-duncit', 'speak', { error });
        setSpeakingId(null);
        return false;
      }
    },
    [role, speakingId, stopSpeaking]
  );

  return { recording, transcribing, speakingId, start, stop, speak, stopSpeaking };
}
