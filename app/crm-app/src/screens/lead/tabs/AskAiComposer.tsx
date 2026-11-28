import { useState } from 'react';
import { TextArea, XStack } from 'tamagui';
import { fireAndForget, logs } from '@duncit/logs';

import { useTranslation } from '@/hooks/useTranslation';
import { TabIconButton } from './TabIconButton';

/** The longest question the box takes — the portal's. */
export const ASK_AI_MAX = 4000;

interface Props {
  busy: boolean;
  /** Resolves false when the question failed and should go back in the box. */
  onSend: (text: string) => Promise<boolean>;
}

/** The question box and Send. */
export function AskAiComposer({ busy, onSend }: Readonly<Props>) {
  const { t } = useTranslation();
  const [input, setInput] = useState('');
  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;
    setInput('');
    if (!(await onSend(text))) setInput(text);
  };
  return (
    <XStack gap="$2" alignItems="flex-end">
      <TextArea
        flex={1}
        value={input}
        onChangeText={setInput}
        maxLength={ASK_AI_MAX}
        placeholder={t('crm.components.askAboutThisLead')}
        placeholderTextColor="$muted"
        aria-label={t('crm.components.askAboutThisLead')}
        borderColor="$inputBorder"
        minHeight={48}
        maxHeight={120}
        testID="crm-ask-ai-input"
      />
      <TabIconButton
        icon="send"
        label={t('crm.components.send')}
        onPress={() => fireAndForget(send(), logs.mobileApp, 'crm-app/AskAiComposer', 'send')}
        disabled={busy || !input.trim()}
        tone="accent"
        testID="crm-ask-ai-send"
      />
    </XStack>
  );
}
