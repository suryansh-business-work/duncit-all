import { useCallback, useEffect, useMemo, useState } from 'react';
import { formatInTimeZone } from 'date-fns-tz';

/** What the thread needs from a formatter — a date in, a string out. */
export interface ChatTimeFormat {
  format: (value: Date) => string;
}

export interface ChatFormats {
  time: ChatTimeFormat;
  full: ChatTimeFormat;
  day: ChatTimeFormat;
}

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
   * date-fns, like the rest of this codebase — and `formatInTimeZone` for the
   * same reason `@duncit/datetime` uses it: it is the stable surface across
   * date-fns-tz majors, where `utcToZonedTime` was renamed under everybody.
   *
   * Built once per setting rather than per message: a long thread renders
   * hundreds of lines and a formatter rebuilt in that loop is visible.
   */
  const formats = useMemo(() => {
    // No choice means this machine's zone, which is what the option says.
    const zone = settings.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone;
    const at = (value: Date, pattern: string) => formatInTimeZone(value, zone, pattern);
    return {
      time: { format: (value: Date) => at(value, 'HH:mm') },
      full: { format: (value: Date) => at(value, 'd MMM yyyy, HH:mm') },
      day: { format: (value: Date) => at(value, 'EEEE, d MMMM') },
    };
  }, [settings.timeZone]);

  /** Spacing that both the bubble and the thread read, so they cannot disagree. */
  const spacing = settings.density === 'COMPACT' ? 0.25 : 0.9;

  return { settings, update, formats, spacing };
}
