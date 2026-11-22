import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AudioModule,
  RecordingPresets,
  createAudioPlayer,
  setAudioModeAsync,
  useAudioRecorder,
  type AudioPlayer,
} from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';
import {
  ASK_DUNCIT_SPEAK_PATH,
  ASK_DUNCIT_TRANSCRIBE_PATH,
  bytesToBase64,
  markdownToPlainText,
} from '@duncit/utils';
import { logs } from '@duncit/logs';

import { config } from '@/constants/config';
import { getAuthToken } from '@/services/auth-token';

/**
 * Voice for Ask Duncit on native — the twin of mWeb's useVoice, against the
 * same two server endpoints: record with expo-audio and send the clip (as
 * base64 JSON) to be transcribed; read answers aloud from the server's MP3.
 */

export type VoiceError = 'PERMISSION' | 'UNSUPPORTED' | 'FAILED';

const SPEECH_FILE = `${FileSystem.cacheDirectory ?? ''}ask-duncit-speech.mp3`;

async function authHeaders(): Promise<Record<string, string>> {
  const token = await getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function useAskDuncitVoice(role: string) {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const player = useRef<AudioPlayer | null>(null);
  const query = `?role=${encodeURIComponent(role)}`;

  useEffect(() => () => player.current?.remove(), []);

  const start = useCallback(async (): Promise<VoiceError | null> => {
    try {
      const permission = await AudioModule.requestRecordingPermissionsAsync();
      if (!permission.granted) return 'PERMISSION';
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      setRecording(true);
      return null;
    } catch (error) {
      logs.mobileApp.warn('ask-duncit', 'record', { error });
      return 'UNSUPPORTED';
    }
  }, [recorder]);

  const stop = useCallback(async (): Promise<string | null> => {
    if (!recording) return null;
    setRecording(false);
    try {
      await recorder.stop();
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
      const uri = recorder.uri;
      if (!uri) return null;
      setTranscribing(true);
      const audio = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const res = await fetch(`${config.apiUrl}${ASK_DUNCIT_TRANSCRIBE_PATH}${query}`, {
        method: 'POST',
        headers: { ...(await authHeaders()), 'Content-Type': 'application/json' },
        body: JSON.stringify({ audio_base64: audio, mime: 'audio/mp4' }),
      });
      if (!res.ok) throw new Error(`transcribe ${res.status}`);
      const body = (await res.json()) as { text?: string };
      return body.text?.trim() || null;
    } catch (error) {
      logs.mobileApp.warn('ask-duncit', 'transcribe', { error });
      return null;
    } finally {
      setTranscribing(false);
    }
  }, [recorder, recording, query]);

  const stopSpeaking = useCallback(() => {
    player.current?.remove();
    player.current = null;
    setSpeakingId(null);
  }, []);

  const speak = useCallback(
    async (messageId: string, markdown: string): Promise<boolean> => {
      if (speakingId === messageId) {
        stopSpeaking();
        return true;
      }
      stopSpeaking();
      setSpeakingId(messageId);
      try {
        const res = await fetch(`${config.apiUrl}${ASK_DUNCIT_SPEAK_PATH}${query}`, {
          method: 'POST',
          headers: { ...(await authHeaders()), 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: markdownToPlainText(markdown) }),
        });
        if (!res.ok) throw new Error(`speak ${res.status}`);
        const bytes = new Uint8Array(await res.arrayBuffer());
        await FileSystem.writeAsStringAsync(SPEECH_FILE, bytesToBase64(bytes), {
          encoding: FileSystem.EncodingType.Base64,
        });
        const next = createAudioPlayer({ uri: SPEECH_FILE });
        player.current = next;
        next.addListener('playbackStatusUpdate', (status) => {
          if (status.didJustFinish) stopSpeaking();
        });
        next.play();
        return true;
      } catch (error) {
        logs.mobileApp.warn('ask-duncit', 'speak', { error });
        setSpeakingId(null);
        return false;
      }
    },
    [query, speakingId, stopSpeaking],
  );

  return { recording, transcribing, speakingId, start, stop, speak, stopSpeaking };
}
