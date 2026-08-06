import type { Coworker, StaffCall, StaffMessage } from './queries';

/**
 * A conversation as a file you can keep.
 *
 * Plain text, in the order it happened, with a full date and time on every
 * line — the point of an export is that it still reads a year later, in
 * something that is not this app.
 *
 * Calls are woven in with the messages rather than listed separately: the
 * record of a call belongs where it happened in the conversation, which is
 * usually the whole reason the next message says what it says.
 */

const stamp = (iso?: string | null) => (iso ? new Date(iso).toLocaleString() : 'unknown time');

const duration = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
};

interface Entry {
  at: number;
  line: string;
}

function messageLine(message: StaffMessage, nameOf: (id: string) => string): string {
  if (message.deleted_at) {
    return `[${stamp(message.created_at)}] ${nameOf(message.from_user_id)}: (message deleted)`;
  }
  const parts: string[] = [];
  if (message.text) parts.push(message.text);
  if (message.attachment_url) {
    parts.push(`[file: ${message.attachment_name || 'attachment'} — ${message.attachment_url}]`);
  }
  const edited = message.edited_at ? ' (edited)' : '';
  return `[${stamp(message.created_at)}] ${nameOf(message.from_user_id)}${edited}: ${parts.join(' ')}`;
}

function callLine(call: StaffCall, nameOf: (id: string) => string): string {
  const who = `${nameOf(call.from_user_id)} → ${nameOf(call.to_user_id)}`;
  const tail =
    call.outcome === 'ANSWERED' ? `answered, ${duration(call.duration_seconds)}` : call.outcome.toLowerCase();
  return `[${stamp(call.started_at)}] ${call.kind.toLowerCase()} call ${who} — ${tail}`;
}

export function buildChatExport(input: {
  me: { id: string; name: string };
  peer: Coworker;
  messages: StaffMessage[];
  calls: StaffCall[];
}): string {
  const nameOf = (id: string) => (id === input.me.id ? input.me.name : input.peer.name);

  const entries: Entry[] = [
    ...input.messages.map((message) => ({
      at: new Date(message.created_at ?? 0).getTime(),
      line: messageLine(message, nameOf),
    })),
    ...input.calls.map((call) => ({
      at: new Date(call.started_at ?? 0).getTime(),
      line: callLine(call, nameOf),
    })),
  ].sort((a, b) => a.at - b.at);

  const header = [
    `Conversation between ${input.me.name} and ${input.peer.name}`,
    `Exported ${new Date().toLocaleString()}`,
    `${input.messages.length} messages · ${input.calls.length} calls`,
    '',
  ];
  return [...header, ...entries.map((entry) => entry.line), ''].join('\n');
}

/** Hand it to the browser as a download. */
export function downloadChatExport(text: string, peerName: string): void {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = globalThis.document.createElement('a');
  link.href = url;
  // A date in the name, because the second export of the same conversation
  // must not silently overwrite the first.
  link.download = `chat-${peerName.replaceAll(/\s+/g, '-').toLowerCase()}-${new Date()
    .toISOString()
    .slice(0, 10)}.txt`;
  link.click();
  URL.revokeObjectURL(url);
}
