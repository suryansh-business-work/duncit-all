import { useCallback, useEffect, useState } from 'react';
import {
  SharedPromptMissingError,
  fetchSharedPrompt,
  reportPublicEvent,
  type PublicEventInput,
  type SharedPrompt,
} from '../../share/publicApi';
import { runInBackground } from '../../log';

export type PublicPromptState =
  | { status: 'loading' }
  | { status: 'missing' }
  | { status: 'failed' }
  | { status: 'ready'; prompt: SharedPrompt };

/**
 * A shared prompt, read with no session. A dead link (switched off, archived,
 * never existed — the server does not say which) and a failed read are kept
 * apart, because only the second is worth retrying.
 */
export function usePublicPrompt(apiOrigin: string, token: string) {
  const [state, setState] = useState<PublicPromptState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: 'loading' });
    fetchSharedPrompt(apiOrigin, token, controller.signal)
      .then((prompt) => {
        setState({ status: 'ready', prompt });
        runInBackground(
          reportPublicEvent(apiOrigin, token, { type: 'PUBLIC_VIEW' }).then((ok) => {
            if (!ok) console.warn('[ai-prompts] could not record a public prompt event', 'PUBLIC_VIEW');
          }),
          'reportPublicEvent',
        );
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        if (err instanceof SharedPromptMissingError) {
          setState({ status: 'missing' });
          return;
        }
        console.warn('[ai-prompts] could not read the shared prompt', err);
        setState({ status: 'failed' });
      });
    return () => controller.abort();
  }, [apiOrigin, token, attempt]);

  const report = useCallback(
    (input: PublicEventInput) => {
      runInBackground(
        reportPublicEvent(apiOrigin, token, input).then((ok) => {
          if (!ok) console.warn('[ai-prompts] could not record a public prompt event', input.type);
        }),
        'reportPublicEvent',
      );
    },
    [apiOrigin, token],
  );

  return { state, retry: () => setAttempt((n) => n + 1), report };
}
