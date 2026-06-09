import { format, isValid } from 'date-fns';

import type { ChatMessage } from '@/hooks/useChat';

/** HH:mm for a message timestamp; empty string when missing or unparseable. */
export function formatMessageTime(iso?: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  return isValid(date) ? format(date, 'HH:mm') : '';
}

export interface ReactionGroup {
  emoji: string;
  count: number;
}

/** Collapse a message's reactions into [{ emoji, count }] for compact display. */
export function groupReactions(reactions?: ChatMessage['reactions'] | null): ReactionGroup[] {
  const counts = new Map<string, number>();
  for (const reaction of reactions ?? []) {
    counts.set(reaction.emoji, (counts.get(reaction.emoji) ?? 0) + 1);
  }
  return [...counts.entries()].map(([emoji, count]) => ({ emoji, count }));
}
