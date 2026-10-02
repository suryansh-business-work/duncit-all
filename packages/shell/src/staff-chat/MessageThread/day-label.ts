import type { ChatFormats } from '../useChatSettings';

/** Today, Yesterday, or the day itself — what a separator has to say. */
export function dayLabel(iso: string, day: ChatFormats['day']): string {
  const at = new Date(iso);
  const now = new Date();
  const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (sameDay(at, now)) return 'shell.chat.thread.today';
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (sameDay(at, yesterday)) return 'shell.chat.thread.yesterday';
  return day.format(at);
}
