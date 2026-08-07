import { useCallback, useEffect, useMemo, useState } from 'react';

export type ChatDensity = 'COMPACT' | 'COMFORTABLE';

export interface ChatSettings {
  density: ChatDensity;
  /** Theme palette key for your own bubbles. */
  bubbleColor: 'primary' | 'secondary' | 'success' | 'info';
  /** Message font size in px. */
  fontSize: number;
  /** IANA zone for every timestamp, or '' to follow the machine. */
  timeZone: string;
  /** False puts Enter on a new line and Ctrl/Cmd+Enter on send. */
  enterToSend: boolean;
}

export const DEFAULT_CHAT_SETTINGS: ChatSettings = {
  density: 'COMFORTABLE',
  bubbleColor: 'primary',
  fontSize: 14,
  timeZone: '',
  enterToSend: true,
};

const KEY = 'duncit.staff-chat.settings';

/**
 * How this person wants the chat to look.
 *
 * Local, not on the server, and deliberately: these are per-DEVICE preferences.
 * The same person wants a compact list on a laptop and a comfortable one on the
 * tablet propped next to it, and a font size synced from a 27-inch monitor is a
 * worse default than the one they would have picked.
 *
 * The reads are guarded because a portal can be opened where storage is denied
 * (private mode, an embedded webview), and a chat that throws on boot over a
 * font size would be an absurd way to lose the feature.
 */
export function useChatSettings() {
  const [settings, setSettings] = useState<ChatSettings>(() => {
    try {
      const raw = globalThis.localStorage?.getItem(KEY);
      return raw ? { ...DEFAULT_CHAT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_CHAT_SETTINGS;
    } catch {
      return DEFAULT_CHAT_SETTINGS;
    }
  });

  useEffect(() => {
    try {
      globalThis.localStorage?.setItem(KEY, JSON.stringify(settings));
    } catch {
      // Storage denied. The settings still apply for this session.
    }
  }, [settings]);

  const update = useCallback(<K extends keyof ChatSettings>(key: K, value: ChatSettings[K]) => {
    setSettings((current) => ({ ...current, [key]: value }));
  }, []);

  /**
   * One formatter for every timestamp in the thread.
   *
   * Built once per setting rather than per message: a long conversation renders
   * hundreds of times, and `Intl.DateTimeFormat` is expensive enough that
   * building one in a render loop is visible.
   */
  const formats = useMemo(() => {
    const zone = settings.timeZone || undefined;
    return {
      time: new Intl.DateTimeFormat(undefined, {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: zone,
      }),
      full: new Intl.DateTimeFormat(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: zone,
      }),
      day: new Intl.DateTimeFormat(undefined, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        timeZone: zone,
      }),
    };
  }, [settings.timeZone]);

  /** Spacing that both the bubble and the thread read, so they cannot disagree. */
  const spacing = settings.density === 'COMPACT' ? 0.25 : 0.9;

  return { settings, update, formats, spacing };
}
