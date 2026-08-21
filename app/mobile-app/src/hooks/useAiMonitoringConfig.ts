import { useEffect, useState } from 'react';
import {
  isAiMonitoringChipVisible,
  resolveAiMonitoringCopy,
  type AiMonitoringConfig,
  type AiMonitoringCopy,
} from '@duncit/ai-monitoring';

import { AiMonitoringConfigDocument } from '@/graphql/ai-monitoring';
import { graphqlRequest } from '@/services/graphql.client';
import { useTranslation } from '@/hooks/useTranslation';

/** Fetched once per app session — the copy is the same for everybody. */
let cached: AiMonitoringConfig | null = null;
let inFlight: Promise<AiMonitoringConfig | null> | null = null;

function loadConfig(): Promise<AiMonitoringConfig | null> {
  if (cached) return Promise.resolve(cached);
  inFlight ??= graphqlRequest(AiMonitoringConfigDocument, {})
    .then((res) => {
      cached = res.aiMonitoringConfig as AiMonitoringConfig;
      return cached;
    })
    // Silent: the bundled fallback copy is complete on its own, so a settings
    // outage must not stop an upload field from saying what happens to a file.
    .catch(() => null)
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}

export interface AiMonitoringState {
  visible: boolean;
  copy: AiMonitoringCopy;
}

/**
 * The RN twin of @duncit/ai-monitoring/mui's `useAiMonitoringConfig`.
 *
 * Both surfaces resolve the SAME admin overrides over the SAME localized
 * fallback through `resolveAiMonitoringCopy` — only the view differs, which is
 * the whole shape of rule 40. Renders the fallback until the config lands, and
 * forever when the device is offline.
 */
export function useAiMonitoringConfig(): AiMonitoringState {
  const { t } = useTranslation();
  const [config, setConfig] = useState<AiMonitoringConfig | null>(cached);

  useEffect(() => {
    let active = true;
    loadConfig().then((next) => {
      if (active && next) setConfig(next);
    });
    return () => {
      active = false;
    };
  }, []);

  return {
    visible: isAiMonitoringChipVisible(config),
    copy: resolveAiMonitoringCopy(config, t),
  };
}
