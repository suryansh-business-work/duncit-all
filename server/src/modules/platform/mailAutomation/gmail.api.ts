/**
 * The slice of the Gmail REST API this feature uses: where am I in the mailbox,
 * what arrived since, what does it say, and send this back on the same thread.
 *
 * Plain `fetch` against `gmail.googleapis.com` — see gmail.oauth.ts for why
 * there is no SDK here.
 */

const API_BASE = 'https://gmail.googleapis.com/gmail/v1/users/me';

/** Raised when Gmail rejects the history cursor as too old to read forward
 * from. Google expires history after about a week, and the documented recovery
 * is to re-baseline — so it is a distinct type, not a generic failure. */
export class HistoryExpiredError extends Error {
  constructor() {
    super('Gmail history cursor has expired');
    this.name = 'HistoryExpiredError';
  }
}

/**
 * Google's own sentence, not the JSON it is wrapped in.
 *
 * A failure here is nearly always a console setting — the Gmail API not
 * enabled on the project, a scope missing, a revoked grant — and Google's
 * `error.message` says exactly which, usually with the URL that fixes it. The
 * surrounding envelope is noise that pushes that sentence out of the operator's
 * view, so it is unwrapped before the message goes anywhere near a screen.
 */
function gmailErrorMessage(status: number, body: string): string {
  try {
    const parsed = JSON.parse(body) as { error?: { message?: string } | string };
    const message =
      typeof parsed.error === 'string' ? parsed.error : (parsed.error?.message ?? '');
    if (message) return `Gmail API ${status}: ${message.slice(0, 500)}`;
  } catch {
    // Not JSON — fall through to the raw text.
  }
  return `Gmail API ${status}: ${body.slice(0, 300)}`;
}

async function gmailFetch<T>(token: string, path: string, init?: RequestInit): Promise<T> {
  const resp = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
      ...init?.headers,
    },
  });
  if (resp.status === 404 && path.startsWith('/history')) throw new HistoryExpiredError();
  if (!resp.ok) {
    const body = await resp.text().catch(() => '');
    throw new Error(gmailErrorMessage(resp.status, body));
  }
  return (await resp.json()) as T;
}

export interface GmailProfile {
  emailAddress: string;
  historyId: string;
}

/** The mailbox's address and its CURRENT history id — the baseline a newly
 * connected account starts reading forward from, so connecting a mailbox never
 * answers the mail that was already sitting in it. */
export function getProfile(token: string): Promise<GmailProfile> {
  return gmailFetch<GmailProfile>(token, '/profile');
}

interface HistoryResponse {
  history?: Array<{ id?: string; messagesAdded?: Array<{ message?: GmailMessageRef }> }>;
  historyId?: string;
  nextPageToken?: string;
}

export interface GmailMessageRef {
  id: string;
  threadId: string;
  labelIds?: string[];
}

export interface AddedMessages {
  /** Inbox arrivals since the cursor, oldest first, de-duplicated. */
  messages: GmailMessageRef[];
  /** The new cursor to store. */
  historyId: string;
  /** True when the page cap stopped the walk before Gmail ran out of pages.
   * The cursor then points at the last record actually read, NOT at the end of
   * the mailbox, so the next poll resumes instead of skipping the remainder. */
  truncated: boolean;
}

/**
 * Everything that landed in the INBOX since `startHistoryId`.
 *
 * Filtered to INBOX on purpose: `messagesAdded` also reports the replies this
 * automation itself sends (they are added to the mailbox as SENT), and reading
 * those back is how an auto-responder ends up answering itself.
 *
 * The page cap is a safety valve, not a limit on correctness. Gmail reports the
 * mailbox's CURRENT history id on every page, so storing that after a
 * short-circuited walk would jump the cursor past everything the walk never
 * read — silently dropping mail. When the cap bites, the cursor returned is the
 * id of the last history record actually consumed, so the next sweep picks up
 * exactly where this one stopped.
 */
function fetchHistoryPage(
  token: string,
  startHistoryId: string,
  pageToken?: string
): Promise<HistoryResponse> {
  const params = new URLSearchParams({
    startHistoryId,
    historyTypes: 'messageAdded',
    maxResults: '100',
  });
  if (pageToken) params.set('pageToken', pageToken);
  return gmailFetch<HistoryResponse>(token, `/history?${params.toString()}`);
}

/** Fold one page's INBOX arrivals into the accumulator; returns the id of the
 * last history record on the page, or '' when it carried none. */
function collectPage(data: HistoryResponse, seen: Map<string, GmailMessageRef>): string {
  let lastRecordId = '';
  for (const record of data.history ?? []) {
    if (record.id) lastRecordId = record.id;
    for (const added of record.messagesAdded ?? []) {
      const message = added.message;
      if (message?.id && message.labelIds?.includes('INBOX')) seen.set(message.id, message);
    }
  }
  return lastRecordId;
}

export async function listAddedMessages(
  token: string,
  startHistoryId: string,
  maxPages = 25
): Promise<AddedMessages> {
  const seen = new Map<string, GmailMessageRef>();
  let pageToken: string | undefined;
  let endHistoryId = startHistoryId;
  let lastRecordId = '';
  let truncated = false;

  for (let page = 0; page < maxPages; page += 1) {
    const data = await fetchHistoryPage(token, startHistoryId, pageToken);
    if (data.historyId) endHistoryId = data.historyId;
    lastRecordId = collectPage(data, seen) || lastRecordId;
    pageToken = data.nextPageToken;
    if (!pageToken) break;
    truncated = page === maxPages - 1;
  }

  // Resume from the last record read when the walk was cut short. Falling back
  // to startHistoryId (rather than the mailbox end) keeps the next sweep
  // correct even if Gmail returned pages carrying no record ids.
  const historyId = truncated ? lastRecordId || startHistoryId : endHistoryId;
  return { messages: [...seen.values()], historyId, truncated };
}

interface GmailPayloadPart {
  mimeType?: string;
  filename?: string;
  headers?: Array<{ name: string; value: string }>;
  body?: { data?: string; size?: number };
  parts?: GmailPayloadPart[];
}

interface GmailMessageResponse {
  id: string;
  threadId: string;
  labelIds?: string[];
  internalDate?: string;
  payload?: GmailPayloadPart;
}

/**
 * Bounds on the text an inbound message carries.
 *
 * Applied HERE, at the edge, rather than left to each writer. Every downstream
 * collection caps these fields, and an email is written by a stranger and
 * bounded by nothing — so an over-long subject is not a cosmetic problem, it is
 * a Mongoose ValidationError on the way in. These ceilings sit at or below the
 * tightest limit any writer enforces (ticket/grievance subject 200, guest name
 * 120, thread row 300/160), so a message that gets through this function
 * cannot be rejected for length by anything that stores it.
 */
const MAX_SUBJECT = 200;
const MAX_FROM_NAME = 120;
const MAX_BODY = 8000;

export interface InboundMessage {
  id: string;
  threadId: string;
  fromEmail: string;
  fromName: string;
  subject: string;
  bodyText: string;
  messageIdHeader: string;
  referencesHeader: string;
  /** True for vacation responders, bounces and mailing-list traffic — mail an
   * auto-responder must never answer, or the two bounce forever. */
  isAutomated: boolean;
}

/**
 * Node can decode the charsets that actually turn up on mail: UTF-8, and the
 * single-byte Latin family that `latin1` covers byte-for-byte. Anything else
 * is read as UTF-8, which is right far more often than it is wrong.
 */
function bufferEncodingFor(charset: string): BufferEncoding {
  const normalised = charset.trim().toLowerCase().replaceAll('"', '');
  if (normalised === 'iso-8859-1' || normalised === 'latin1' || normalised === 'windows-1252') {
    return 'latin1';
  }
  if (normalised === 'us-ascii' || normalised === 'ascii') return 'ascii';
  return 'utf8';
}

const decodeBase64Url = (data: string, charset = 'utf-8') =>
  Buffer.from(data, 'base64url').toString(bufferEncodingFor(charset));

const headerValue = (part: GmailPayloadPart | undefined, name: string): string => {
  const target = name.toLowerCase();
  const found = part?.headers?.find((h) => h.name.toLowerCase() === target);
  return found?.value ?? '';
};

/** The charset out of a part's own Content-Type, e.g. `text/plain; charset="ISO-8859-1"`. */
function charsetOf(part: GmailPayloadPart): string {
  const contentType = headerValue(part, 'Content-Type');
  return /charset\s*=\s*"?([\w-]+)"?/i.exec(contentType)?.[1] ?? 'utf-8';
}

/**
 * Decode RFC 2047 encoded-words, e.g. `=?UTF-8?B?4KS44KSu?=` or `=?utf-8?Q?caf=E9?=`.
 *
 * Gmail hands header values back exactly as they arrived, so an accented name
 * or a non-Latin subject reaches us as this wire format. Left undecoded it
 * reaches the ticket, the auto-reply and the Support queue as visible
 * gibberish — and it inflates the string well past the length limits the
 * models enforce, which is a second, sharper failure.
 */
export function decodeEncodedWords(raw: string): string {
  if (!raw.includes('=?')) return raw;
  // Adjacent encoded-words are separated by whitespace that RFC 2047 says to
  // drop; do that first so multi-word runs join up cleanly.
  const joined = raw.replaceAll(/\?=\s+=\?/g, '?==?');
  return joined.replaceAll(
    /=\?([\w-]+)\?([BbQq])\?([^?]*)\?=/g,
    (whole, charset: string, encoding: string, payload: string) => {
      try {
        if (encoding.toUpperCase() === 'B') {
          return Buffer.from(payload, 'base64').toString(bufferEncodingFor(charset));
        }
        // Q encoding: '_' is a space, =XX is a byte.
        const bytes: number[] = [];
        const text = payload.replaceAll('_', ' ');
        for (let i = 0; i < text.length; i += 1) {
          if (text[i] === '=' && i + 2 < text.length) {
            bytes.push(Number.parseInt(text.slice(i + 1, i + 3), 16));
            i += 2;
          } else {
            bytes.push(text.codePointAt(i) ?? 0);
          }
        }
        return Buffer.from(bytes).toString(bufferEncodingFor(charset));
      } catch {
        // A malformed encoded-word is still better shown as it arrived than
        // dropped — the agent can at least see something was there.
        return whole;
      }
    }
  );
}

/** `"Asha Rao" <asha@x.com>` / `asha@x.com` → the two halves. Index scanning
 * rather than a regex: `<([^>]+)>` is flagged for backtracking (S8786) and
 * this runs on a header a stranger controls. */
export function parseFromHeader(raw: string): { email: string; name: string } {
  const open = raw.indexOf('<');
  const close = open === -1 ? -1 : raw.indexOf('>', open + 1);
  const angled = open !== -1 && close !== -1;
  const email = (angled ? raw.slice(open + 1, close) : raw).trim().toLowerCase();
  const namePart = angled ? raw.slice(0, open).trim() : '';
  const name = decodeEncodedWords(namePart.replace(/^"|"$/g, '').trim());
  return { email, name };
}

/** Drop a `<script>…</script>` / `<style>…</style>` block, contents included. */
function dropBlocks(html: string, tag: string): string {
  const lower = html.toLowerCase();
  let out = '';
  let at = 0;
  for (;;) {
    const start = lower.indexOf(`<${tag}`, at);
    if (start === -1) break;
    out += html.slice(at, start);
    const end = lower.indexOf(`</${tag}`, start);
    if (end === -1) return out; // Unterminated — the rest is inside the block.
    const close = html.indexOf('>', end);
    at = close === -1 ? html.length : close + 1;
  }
  return out + html.slice(at);
}

/** Everything between `<` and `>` out, one pass. Same result as `<[^>]+>` but
 * without the backtracking the analyser objects to (S8786). */
function stripTags(html: string): string {
  let out = '';
  let inTag = false;
  for (const char of html) {
    if (char === '<') inTag = true;
    else if (char === '>' && inTag) {
      inTag = false;
      out += ' ';
    } else if (!inTag) out += char;
  }
  return out;
}

/** Text out of an HTML part, when the sender gave us no plain-text alternative. */
function htmlToText(html: string): string {
  return stripTags(
    dropBlocks(dropBlocks(html, 'script'), 'style')
      .replaceAll(/<br\s*\/?>/gi, '\n')
      .replaceAll(/<\/p>/gi, '\n\n')
  )
    .replaceAll('&nbsp;', ' ')
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll(/[ \t]{2,}/g, ' ')
    .trim();
}

/**
 * Depth-first walk in DOCUMENT ORDER for the best readable body: plain text
 * wins, HTML is the consolation, attachments are skipped.
 *
 * Recursion rather than a stack, because a stack visits siblings backwards —
 * and combined with the first-wins rule below that quietly picked the LAST
 * text part of a multipart message. On a forwarded mail or an Apple Mail
 * message with an inline attachment, the last part is not the one the sender
 * wrote.
 */
function extractBody(part: GmailPayloadPart | undefined): { text: string; html: string } {
  const result = { text: '', html: '' };
  const visit = (current: GmailPayloadPart | undefined): void => {
    if (!current || (result.text && result.html)) return;
    const data = current.body?.data;
    const mime = current.mimeType ?? '';
    if (data && !current.filename) {
      if (mime === 'text/plain' && !result.text) result.text = decodeBase64Url(data, charsetOf(current));
      if (mime === 'text/html' && !result.html) result.html = decodeBase64Url(data, charsetOf(current));
    }
    for (const child of current.parts ?? []) visit(child);
  };
  visit(part);
  return result;
}

/**
 * Quoted history and signatures off, so the ticket carries what they wrote
 * rather than the whole chain underneath it.
 *
 * Strips nothing when stripping would leave nothing. A message that opens on a
 * quoted line, or that is only a signature, is still the message somebody
 * sent — losing it entirely is far worse than a ticket carrying some quoted
 * text, and downstream the body is a REQUIRED field on a grievance.
 */
export function stripQuotedReply(text: string): string {
  const lines = text.split(/\r?\n/);
  const cut = lines.findIndex(
    (line) =>
      /^\s*>/.test(line) ||
      /^\s*On .+ wrote:\s*$/.test(line) ||
      /^\s*-{2,}\s*Original Message\s*-{2,}/i.test(line) ||
      /^\s*--\s*$/.test(line)
  );
  const kept = cut === -1 ? lines : lines.slice(0, cut);
  const stripped = kept.join('\n').trim();
  return stripped || text.trim();
}

/** One message, reduced to what a ticket and a reply actually need. */
export async function getMessage(token: string, id: string): Promise<InboundMessage> {
  const raw = await gmailFetch<GmailMessageResponse>(token, `/messages/${id}?format=full`);
  const payload = raw.payload;
  const from = parseFromHeader(headerValue(payload, 'From'));
  const body = extractBody(payload);
  const text = body.text || htmlToText(body.html);
  const autoSubmitted = headerValue(payload, 'Auto-Submitted').toLowerCase();
  const precedence = headerValue(payload, 'Precedence').toLowerCase();

  return {
    id: raw.id,
    threadId: raw.threadId,
    fromEmail: from.email,
    fromName: from.name.slice(0, MAX_FROM_NAME),
    subject: decodeEncodedWords(headerValue(payload, 'Subject')).trim().slice(0, MAX_SUBJECT),
    bodyText: stripQuotedReply(text).slice(0, MAX_BODY),
    messageIdHeader: headerValue(payload, 'Message-ID'),
    referencesHeader: headerValue(payload, 'References'),
    isAutomated:
      (autoSubmitted !== '' && autoSubmitted !== 'no') ||
      ['bulk', 'list', 'junk'].includes(precedence) ||
      headerValue(payload, 'List-Id') !== '' ||
      headerValue(payload, 'X-Autoreply') !== '',
  };
}

/** RFC 2047 for a header that is not pure printable ASCII — an unencoded
 * accent in a subject line renders as mojibake in most clients. Character
 * codes rather than a regex: the regex form needs control-character escapes
 * and reads far worse than the loop. */
function encodeHeader(value: string): string {
  let printableAscii = true;
  for (const char of value) {
    const code = char.codePointAt(0) ?? 0;
    if (code < 32 || code > 126) {
      printableAscii = false;
      break;
    }
  }
  if (printableAscii) return value;
  return `=?UTF-8?B?${Buffer.from(value, 'utf8').toString('base64')}?=`;
}

export interface ReplyParams {
  fromEmail: string;
  fromName: string;
  toEmail: string;
  subject: string;
  bodyText: string;
  threadId: string;
  inReplyTo: string;
  references: string;
  /** False when a HUMAN wrote the body (an agent's ticket reply): the
   * Auto-Submitted header marks robot mail, and claiming it on a human's
   * words would be untrue. Omitted/true keeps the acknowledgement path
   * exactly as it was. */
  autoReply?: boolean;
}

/** The reply as RFC 2822, threaded. In-Reply-To and References are what make
 * Gmail (and everyone else) show it as part of the same conversation instead
 * of a new one — `threadId` alone only does so inside our own mailbox. */
export function buildReplyMime(params: ReplyParams): string {
  // A CR or LF reaching a header line would let a sender-controlled value
  // append headers of its own. encodeHeader already base64s anything with a
  // control character in it, but the address is not encoded — so it is
  // stripped here rather than relying on that one path staying true.
  const toEmail = params.toEmail.replaceAll(/[\r\n]/g, '');
  const subject = params.subject.toLowerCase().startsWith('re:')
    ? params.subject
    : `Re: ${params.subject}`;
  const references = [params.references, params.inReplyTo].filter(Boolean).join(' ');
  const headers = [
    `From: ${encodeHeader(params.fromName)} <${params.fromEmail}>`,
    `To: ${toEmail}`,
    `Subject: ${encodeHeader(subject)}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
  ];
  // Tells the next auto-responder in the chain not to answer this one. A
  // human agent's reply is not auto-submitted, so it goes out without it.
  if (params.autoReply !== false) headers.push('Auto-Submitted: auto-replied');
  if (params.inReplyTo) headers.push(`In-Reply-To: ${params.inReplyTo}`);
  if (references) headers.push(`References: ${references}`);
  const body = Buffer.from(params.bodyText, 'utf8').toString('base64');
  return `${headers.join('\r\n')}\r\n\r\n${body}`;
}

/** Send the reply into the existing thread. Returns Gmail's message id. */
export async function sendReply(token: string, params: ReplyParams): Promise<string> {
  const raw = Buffer.from(buildReplyMime(params), 'utf8').toString('base64url');
  const sent = await gmailFetch<{ id: string }>(token, '/messages/send', {
    method: 'POST',
    body: JSON.stringify({ raw, threadId: params.threadId }),
  });
  return sent.id;
}
