import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import type { IntelBootstrap, IntelConversation } from '@duncit/gql-types';
import { notifyError } from '@duncit/dialogs';
import { useTranslation } from '@duncit/app-settings';
import { INTEL_UPDATE_CONVERSATION } from '../../graphql/chat';
import type { ComposerSettings } from './composer/ComposerControls';

/**
 * Model, environment and sources for the open conversation: taken from the
 * conversation when it exists (and saved back to it on change), from the
 * console defaults for a new chat (saved with its first message).
 */

/** The default environment, if this person may read it; otherwise the first one they may. */
export function defaultEnvironment(boot: IntelBootstrap | null): string {
  const allowed = boot?.me.environments ?? ['STAGING'];
  const wanted = boot?.default_environment ?? 'STAGING';
  if (wanted === 'BOTH') return allowed.length === 2 ? 'BOTH' : (allowed[0] ?? 'STAGING');
  return allowed.includes(wanted) ? wanted : (allowed[0] ?? 'STAGING');
}

export function initialSettings(conversation: IntelConversation | null, boot: IntelBootstrap | null): ComposerSettings {
  return {
    model: conversation?.model || boot?.default_model || '',
    environment: conversation?.environment ?? defaultEnvironment(boot),
    sources: conversation?.sources ?? [],
  };
}

export function useComposerSettings(conversation: IntelConversation | null, boot: IntelBootstrap | null) {
  const { t } = useTranslation();
  const [settings, setSettings] = useState<ComposerSettings>(() => initialSettings(conversation, boot));
  const [update] = useMutation(INTEL_UPDATE_CONVERSATION);
  const convId = conversation?.id;

  // Re-seed when another conversation opens or the bootstrap first arrives — not on every refetch.
  const seedKey = `${convId ?? 'new'}:${boot ? 'ready' : 'loading'}`;
  const [seededFor, setSeededFor] = useState(seedKey);
  if (seededFor !== seedKey) {
    setSeededFor(seedKey);
    setSettings(initialSettings(conversation, boot));
  }

  const change = (next: ComposerSettings) => {
    setSettings(next);
    if (!convId) return;
    update({ variables: { id: convId, patch: { model: next.model, environment: next.environment, sources: next.sources } } }).catch(() => notifyError(t('intel.chat.settingsSaveFailed')));
  };
  return { settings, change };
}
