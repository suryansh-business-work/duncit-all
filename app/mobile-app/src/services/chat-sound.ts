import { Platform } from 'react-native';
import { createChatPingGate } from '@duncit/utils';

import { useNotificationPrefsStore } from '@/stores/notification-prefs.store';

/**
 * The chat ping, played with expo-audio — the same sound mWeb and the portals'
 * staff chat make (the mp3 is bundled as an app asset).
 *
 * expo-audio is loaded lazily and only the calls used here are typed, the way
 * local-notifications loads expo-notifications: a build without the native
 * module (Expo Go, an older binary, the web target, jest) plays nothing and
 * throws nothing. A sound nobody hears must never cost the message.
 */
interface AudioPlayerLike {
  volume: number;
  play: () => void;
  seekTo: (seconds: number) => unknown;
}

interface ExpoAudioLike {
  createAudioPlayer: (source: number) => AudioPlayerLike;
  setAudioModeAsync?: (mode: Record<string, unknown>) => Promise<void>;
}

// eslint-disable-next-line @typescript-eslint/no-require-imports -- bundled asset id
const PING_ASSET: number = require('../../assets/sounds/chat-ping-new-message.mp3');

let player: AudioPlayerLike | null = null;
let unavailable = false;

function loadPlayer(): AudioPlayerLike | null {
  if (player || unavailable) return player;
  if (Platform.OS === 'web') {
    unavailable = true;
    return null;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- lazy native-only module
    const audio = require('expo-audio') as ExpoAudioLike;
    // A ping should sit on top of whatever is playing, never stop it, and stay
    // silent when the phone is on silent.
    audio
      .setAudioModeAsync?.({ playsInSilentMode: false, interruptionMode: 'mixWithOthers' })
      .catch(() => undefined);
    player = audio.createAudioPlayer(PING_ASSET);
    player.volume = 0.6;
  } catch {
    unavailable = true;
  }
  return player;
}

/** One gate for the whole app: the open room and the app-wide banner share it,
 * so a burst of messages — in one room or across rooms — makes one ping. */
const shouldPing = createChatPingGate();

/**
 * Pings for an arriving message, unless its burst already pinged or the
 * device-local notification switch is off.
 */
export function pingForMessage(messageId: string): void {
  if (!useNotificationPrefsStore.getState().enabled) return;
  if (!shouldPing(messageId)) return;
  const ping = loadPlayer();
  if (!ping) return;
  try {
    ping.seekTo(0);
    ping.play();
  } catch {
    // Best-effort.
  }
}
