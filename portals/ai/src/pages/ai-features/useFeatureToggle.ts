import { useCallback, useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { notifyError, notifySuccess, useConfirm } from '@duncit/dialogs';
import { useTranslation } from '@duncit/shell';
import { parseApiError } from '@duncit/utils';
import { SET_AI_FEATURE_ENABLED, type AiFeature } from './queries';

/**
 * Flip one feature's switch. Switching OFF asks first and says what the product
 * does instead — for a moderation scan that is "rule-based checks only", which
 * is not something to do by a stray click. Switching back ON needs no warning.
 *
 * Authorization and the audit trail are the server's: the mutation is gated to
 * the AI portal's roles and every write lands in the table change log.
 */
export function useFeatureToggle(onChanged: () => void) {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [save] = useMutation<{ setAiFeatureEnabled: Pick<AiFeature, 'key' | 'enabled'> }>(
    SET_AI_FEATURE_ENABLED
  );

  const toggle = useCallback(
    async (feature: AiFeature, enabled: boolean) => {
      if (!enabled) {
        const ok = await confirm({
          title: t('ai.features.offTitle', { vars: { name: feature.label } }),
          message: t('ai.features.offMessage', { vars: { whenOff: feature.when_off } }),
          confirmLabel: t('ai.features.offConfirm'),
          destructive: true,
        });
        if (!ok) return;
      }
      setPendingKey(feature.key);
      try {
        await save({ variables: { key: feature.key, enabled } });
        notifySuccess(
          enabled
            ? t('ai.features.turnedOn', { vars: { name: feature.label } })
            : t('ai.features.turnedOff', { vars: { name: feature.label } })
        );
        onChanged();
      } catch (error) {
        notifyError(parseApiError(error, t('ai.features.saveFailed')));
      } finally {
        setPendingKey(null);
      }
    },
    [confirm, save, onChanged, t]
  );

  return { toggle, pendingKey };
}
