import { fallbackT, type Translate } from '../i18n/fallback';
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

const stamp = (t: Translate, iso?: string | null) =>
  iso ? new Date(iso).toLocaleString() : t('shell.chat.export.unknownTime');

const duration = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
};

interface Entry {
  at: number;
  line: string;
}

type NameOf = (id: string) => string;

const KIND_KEY: Record<StaffCall['kind'], string> = {
  AUDIO: 'shell.chat.export.audio',
  VIDEO: 'shell.chat.export.video',
};

/** An answered call says how long it ran instead, so it has no row here. */
const OUTCOME_KEY: Record<Exclude<StaffCall['outcome'], 'ANSWERED'>, string> = {
  MISSED: 'shell.chat.export.missed',
  DECLINED: 'shell.chat.export.declined',
  CANCELLED: 'shell.chat.export.cancelled',
};

function messageLine(message: StaffMessage, nameOf: NameOf, t: Translate): string {
  const when = stamp(t, message.created_at);
  const name = nameOf(message.from_user_id);
  if (message.deleted_at) {
    return t('shell.chat.export.deletedLine', { vars: { when, name } });
  }
  const parts: string[] = [];
  if (message.text) parts.push(message.text);
  if (message.attachment_url) {
    parts.push(
      t('shell.chat.export.fileLine', {
        vars: {
          name: message.attachment_name || t('shell.chat.export.attachment'),
          url: message.attachment_url,
        },
      })
    );
  }
  const edited = message.edited_at ? t('shell.chat.export.edited') : '';
  return t('shell.chat.export.messageLine', { vars: { when, name, edited, text: parts.join(' ') } });
}

function callLine(call: StaffCall, nameOf: NameOf, t: Translate): string {
  const outcome =
    call.outcome === 'ANSWERED'
      ? t('shell.chat.export.answered', { vars: { duration: duration(call.duration_seconds) } })
      : t(OUTCOME_KEY[call.outcome]);
  return t('shell.chat.export.callLine', {
    vars: {
      when: stamp(t, call.started_at),
      kind: t(KIND_KEY[call.kind]),
      from: nameOf(call.from_user_id),
      to: nameOf(call.to_user_id),
      outcome,
    },
  });
}

/**
 * `t` is the caller's translator, so the file reads in the language the panel
 * does. Left out — a caller with no React tree around it — the transcript is
 * written in the shipped English.
 */
export function buildChatExport(
  input: {
    me: { id: string; name: string };
    peer: Coworker;
    messages: StaffMessage[];
    calls: StaffCall[];
  },
  t: Translate = fallbackT
): string {
  const nameOf: NameOf = (id) => (id === input.me.id ? input.me.name : input.peer.name);

  const entries: Entry[] = [
    ...input.messages.map((message) => ({
      at: new Date(message.created_at ?? 0).getTime(),
      line: messageLine(message, nameOf, t),
    })),
    ...input.calls.map((call) => ({
      at: new Date(call.started_at ?? 0).getTime(),
      line: callLine(call, nameOf, t),
    })),
  ].sort((a, b) => a.at - b.at);

  const header = [
    t('shell.chat.export.title', { vars: { me: input.me.name, peer: input.peer.name } }),
    t('shell.chat.export.exported', { vars: { when: new Date().toLocaleString() } }),
    t('shell.chat.export.counts', {
      vars: { messages: input.messages.length, calls: input.calls.length },
    }),
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
