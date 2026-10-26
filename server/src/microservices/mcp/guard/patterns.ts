/**
 * Prompt-injection signatures.
 *
 * Two places they matter:
 *  - ARGUMENTS an AI sends. If a model has been hijacked by something it read,
 *    the next thing it tries is to write the payload somewhere other agents
 *    will read it — a pod description, a ticket, a CMS page. Blocking that is
 *    what stops one poisoned page becoming a stored injection.
 *  - RESULTS a tool returns. Member-written text (pod titles, chat messages,
 *    reviews) goes straight into the model's context. Those are never blocked
 *    (they are real data) but flagged, and invisible control characters are
 *    stripped from them.
 *
 * Every phrase rule needs its words in ORDER within a short window — "ignore
 * the noise", "forget your umbrella" or "System: offline" never match. Only
 * `blocking` rules can refuse a call; the rest only flag. Each window is a
 * bounded `[^.\n]{0,n}`, so matching stays linear however long the text is.
 */

export interface InjectionRule {
  id: string;
  label: string;
  blocking: boolean;
  test(text: string): boolean;
}

const anyOf = (words: readonly string[]): string => `(?:${words.join('|')})`;

/** Word groups in order, each within `gaps[i]` characters of the previous one, same sentence. */
function sequence(groups: ReadonlyArray<readonly string[]>, gaps: readonly number[]): RegExp {
  const body = groups
    .map((words, index) => (index === 0 ? '' : `[^.\\n]{0,${gaps[index - 1]}}`) + `\\b${anyOf(words)}\\b`)
    .join('');
  return new RegExp(body, 'i');
}

const matcher = (pattern: RegExp) => (text: string) => pattern.test(text);

const IGNORE = sequence(
  [
    ['ignore', 'disregard', 'forget', 'override', 'bypass'],
    ['previous', 'prior', 'above', 'earlier', 'preceding', 'all', 'any', 'your', 'system'],
    ['instructions?', 'prompts?', 'rules', 'directives', 'guidelines', 'guardrails'],
  ],
  [40, 25]
);

const ROLE_HIJACK = sequence(
  [
    ['you are now', 'from now on,? you are', 'act as', 'pretend to be', 'pretend you are'],
    // Not a bare "dan": that is also a name ("act as captain while Dan is away").
    ['unrestricted', 'unfiltered', 'jailbroken', 'developer mode', 'dan mode', 'without filters', 'no filters', 'no rules', 'no restrictions', 'no limits'],
  ],
  [40]
);

const EXFILTRATE = sequence(
  [
    ['reveal', 'print', 'show', 'repeat', 'output', 'leak', 'dump'],
    ['system prompt', 'hidden instructions', 'hidden prompt', 'developer message', 'developer prompt', 'initial instructions'],
  ],
  [30]
);

const CREDENTIALS = sequence(
  [
    ['send', 'email', 'post', 'forward', 'share'],
    ['passwords?', 'api keys?', 'tokens?', 'credentials', 'one-time codes?', 'otp'],
    ['to', 'at'],
  ],
  [40, 40]
);

const TEMPLATE_TOKENS = new RegExp(
  `<\\|${anyOf(['im_start', 'im_end', 'system', 'endoftext', 'eot_id', 'start_header_id', 'end_header_id'])}\\|>|\\[/?INST\\]|<</?SYS>>`,
  'i'
);

const TOOL_MARKUP = new RegExp(`</?${anyOf(['function_calls', 'invoke', 'tool_call', 'tool_use', 'tool_result'])}\\b`, 'i');

const SYSTEM_HEADER = new RegExp(`(?:^|\\n)[ \\t#]*${anyOf(['system', 'developer'])} ${anyOf(['prompt', 'message', 'instructions?'])}:`, 'i');

/**
 * Tag characters (U+E0000–E007F) encode text no human sees; bidi overrides
 * reorder what is shown. Zero-width joiners are NOT here — emoji use them.
 *
 * The one legitimate use of tag characters is a subdivision flag (England,
 * Scotland, Wales): a black flag, two to six tag letters, then a cancel tag.
 * Those are kept whole; any other tag character is invisible text.
 */
const SUBDIVISION_FLAG = /(\u{1F3F4}[\u{E0061}-\u{E007A}]{2,6}\u{E007F})/u;
const INVISIBLE_CONTROL_CHARACTERS = /[\u{E0000}-\u{E007F}\u{202A}-\u{202E}\u{2066}-\u{2069}]/gu;
const INVISIBLE = /[\u{E0000}-\u{E007F}\u{202A}-\u{202E}\u{2066}-\u{2069}]/u;

/** The text split around subdivision flags: even indexes are text, odd indexes are flags. */
const splitFlags = (text: string): string[] => text.split(SUBDIVISION_FLAG);

const hasInvisible = (text: string): boolean =>
  splitFlags(text).some((part, index) => index % 2 === 0 && INVISIBLE.test(part));

/** The text without invisible control characters (flags kept whole), and how many were removed. */
export function stripControls(text: string): { text: string; stripped: number } {
  let stripped = 0;
  const parts = splitFlags(text).map((part, index) =>
    index % 2 === 1
      ? part
      : part.replace(INVISIBLE_CONTROL_CHARACTERS, () => {
          stripped += 1;
          return '';
        })
  );
  return { text: parts.join(''), stripped };
}

/** A markdown image whose URL would carry data out in its query string. */
const IMAGE_LINK = /!\[[^\]\n]{0,200}\]\((https?:\/\/[^)\s]{1,2000})\)/gi;
const LEAKY_QUERY = /[{]|%7B|secret|token|password|conversation|history/i;

function hasLeakyImage(text: string): boolean {
  for (const [, url] of text.matchAll(IMAGE_LINK)) {
    const query = url.split('?')[1];
    if (query && LEAKY_QUERY.test(query)) return true;
  }
  return false;
}

export const INJECTION_RULES: readonly InjectionRule[] = [
  { id: 'ignore_instructions', label: 'Asks the model to ignore or override its instructions', blocking: true, test: matcher(IGNORE) },
  { id: 'role_hijack', label: 'Tries to give the model a new, unrestricted role', blocking: true, test: matcher(ROLE_HIJACK) },
  { id: 'prompt_exfiltration', label: 'Asks the model to reveal its hidden instructions', blocking: true, test: matcher(EXFILTRATE) },
  { id: 'chat_template_tokens', label: 'Contains raw chat-template control tokens', blocking: true, test: matcher(TEMPLATE_TOKENS) },
  { id: 'tool_call_markup', label: 'Contains markup that imitates a tool call', blocking: true, test: matcher(TOOL_MARKUP) },
  { id: 'hidden_unicode', label: 'Contains invisible Unicode tag or direction-override characters', blocking: true, test: hasInvisible },
  { id: 'fake_system_header', label: 'Imitates a system or developer message header', blocking: false, test: matcher(SYSTEM_HEADER) },
  { id: 'credential_request', label: 'Asks for a password, key or code to be sent somewhere', blocking: false, test: matcher(CREDENTIALS) },
  { id: 'markdown_exfiltration', label: 'An image link that would send data out in its query string', blocking: false, test: hasLeakyImage },
];
