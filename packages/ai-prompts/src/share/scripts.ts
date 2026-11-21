import type { PromptPlatform } from './platforms';

/**
 * Copy-ready "injection" scripts: a few lines of JavaScript that put a prompt
 * into an LLM's chat box, for the cases a prefilled link cannot cover — a
 * prompt too long for a URL, a chat that is already open, a saved bookmarklet.
 *
 * The reader runs it themselves, on the platform's own page (DevTools console,
 * or as a bookmark). It only types into the composer; it never presses send.
 *
 * Everything variable is embedded with `JSON.stringify`, so no prompt text —
 * quotes, backticks, `</script>`, line breaks — can end the string early and
 * run as code.
 */

export interface ScriptMessages {
  /** Logged when the page has no chat box (the reader is not on a chat). */
  noComposer: string;
  /** Logged once the prompt is in the box. */
  inserted: string;
}

/**
 * Textareas are React-controlled on all four platforms, so the value is set
 * through the native setter and announced with an `input` event — assigning
 * `.value` alone is overwritten on the next render. Rich editors (ProseMirror on
 * Claude and ChatGPT) take a synthetic paste, which they handle like a real one.
 */
export function injectionScript(platform: PromptPlatform, text: string, messages: ScriptMessages): string {
  return [
    '(() => {',
    `  const text = ${JSON.stringify(text)};`,
    `  const selectors = ${JSON.stringify(platform.composer)};`,
    '  const box = selectors.map((s) => document.querySelector(s)).find(Boolean);',
    `  const missing = ${JSON.stringify(messages.noComposer)};`,
    '  if (!box) { console.warn(missing); return; }',
    '  box.focus();',
    "  if (box instanceof HTMLTextAreaElement || box instanceof HTMLInputElement) {",
    "    const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(box), 'value').set;",
    '    setter.call(box, text);',
    "    box.dispatchEvent(new Event('input', { bubbles: true }));",
    '  } else {',
    '    const data = new DataTransfer();',
    "    data.setData('text/plain', text);",
    "    box.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }));",
    '  }',
    `  console.info(${JSON.stringify(messages.inserted)});`,
    '})();',
  ].join('\n');
}

/** The same script as a bookmarklet: save it as a bookmark, click it on the chat page. */
export const bookmarklet = (script: string): string =>
  `javascript:${encodeURIComponent(script.replaceAll('\n', ' '))}`;
