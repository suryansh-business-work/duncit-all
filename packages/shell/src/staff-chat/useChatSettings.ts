/**
 * What "how the chat looks" means, and what it defaults to.
 *
 * Types and defaults only. The hook that used to live here kept these in
 * localStorage, which was the wrong unit: the same panel renders inside all
 * seventeen consoles, so per-device really meant per-portal, and moving from
 * admin to finance forgot everything. useChatState owns them now, on the
 * server. The names stay here because ten files import these types.
 */

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
