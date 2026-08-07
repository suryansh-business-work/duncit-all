/**
 * Everything known about something that went wrong, kept together.
 *
 * A single string was not enough twice over. Once because the headline can be
 * a translation KEY (our own copy) or a sentence the browser produced, and the
 * renderer has to be able to try both. And once because the useful part is
 * often not in the message at all: OverconstrainedError carries an empty
 * message and puts the answer in `constraint`, so the version a person could
 * act on — "the camera you chose is gone" — was being thrown away and an empty
 * string shown in its place.
 */
export interface Failure {
  /** A translation key, or a sentence the browser produced. Never empty. */
  message: string;
  /** The whole throw, verbatim, for whoever has to report it. */
  detail: string;
}

/** `key: value` when there is a value, nothing at all when there is not. */
const line = (label: string, value: string | number | undefined): string[] => {
  if (value === undefined || value === '') return [];
  return [`${label}: ${value}`];
};

/**
 * Read a thrown value into something showable.
 *
 * `fallbackKey` is used only when the error itself says nothing — an empty
 * message must never reach the UI, because an empty error is indistinguishable
 * from no error and closes the window it was meant to explain.
 */
export function describeFailure(error: unknown, fallbackKey: string): Failure {
  if (!(error instanceof Error)) {
    return { message: fallbackKey, detail: `Thrown value: ${JSON.stringify(error) ?? 'undefined'}` };
  }

  // Not on Error, but present on the ones that matter here: OverconstrainedError
  // names the constraint it could not satisfy, DOMException carries a code, and
  // a wrapped failure keeps the original underneath.
  const extras = error as Error & { constraint?: string; code?: number; cause?: unknown };
  const causeMessage = extras.cause instanceof Error ? extras.cause.message : undefined;

  const detail = [
    `${error.name}: ${error.message || '(no message)'}`,
    ...line('constraint', extras.constraint),
    ...line('code', extras.code),
    ...line('cause', causeMessage),
    ...line('stack', error.stack),
  ].join('\n');

  return { message: error.message.trim() || fallbackKey, detail };
}

/** A plain sentence with nothing more behind it — a server message, usually. */
export const plainFailure = (message: string, fallbackKey: string): Failure => ({
  message: message.trim() || fallbackKey,
  detail: message.trim(),
});

/**
 * Our own copy, where nothing was thrown.
 *
 * No detail on purpose: there is no stack behind "start a video call first",
 * and offering to expand an explanation into the same explanation is noise.
 */
export const failureFromKey = (key: string): Failure => ({ message: key, detail: '' });
